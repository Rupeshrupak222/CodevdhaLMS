import { Router, Request, Response } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import prisma from '../../config/database';

const router = Router();
router.use(authenticate);

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CHART_COLORS = ['#F5C242', '#38BDF8', '#A855F7', '#4ADE80', '#F43F5E', '#10B981'];

type RecentActivity = {
  id: string;
  student: string;
  action: string;
  details: string;
  time: string;
  timestamp: number;
  status: string;
};

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDays}d ago`;
}

function buildMonthBuckets() {
  const buckets: Array<{ key: string; name: string; start: Date; end: Date }> = [];

  for (let i = 5; i >= 0; i--) {
    const current = new Date();
    current.setMonth(current.getMonth() - i);

    const start = new Date(current.getFullYear(), current.getMonth(), 1);
    const end = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);
    const key = `${start.getFullYear()}-${start.getMonth()}`;

    buckets.push({
      key,
      name: MONTH_NAMES[start.getMonth()],
      start,
      end,
    });
  }

  return buckets;
}

router.get('/dashboard', asyncHandler(async (req: Request, res: Response) => {
  const role = req.user!.role;
  const userId = req.user!.userId;
  const payload: Record<string, unknown> = {};

  const teacherCourses = role === 'TEACHER'
    ? await prisma.courseTeacher.findMany({ where: { teacherId: userId }, select: { courseId: true } })
    : [];
  const teacherCourseIds = teacherCourses.map((c) => c.courseId);

  const studentEnrollments = role === 'STUDENT'
    ? await prisma.enrollment.findMany({ where: { studentId: userId }, select: { courseId: true, enrolledAt: true } })
    : [];
  const studentCourseIds = studentEnrollments.map((e) => e.courseId);

  if (role === 'ADMIN') {
    const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
    const totalTeachers = await prisma.user.count({ where: { role: 'TEACHER' } });
    const totalCourses = await prisma.course.count();
    const totalClasses = await prisma.liveClass.count();

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const studentsThisMonth = await prisma.user.count({
      where: { role: 'STUDENT', createdAt: { gte: startOfCurrentMonth } },
    });
    const studentsBeforeThisMonth = totalStudents - studentsThisMonth;
    const studentPctChange = studentsBeforeThisMonth > 0
      ? Math.round((studentsThisMonth / studentsBeforeThisMonth) * 100)
      : (studentsThisMonth > 0 ? 100 : 0);

    const teachersThisMonth = await prisma.user.count({
      where: { role: 'TEACHER', createdAt: { gte: startOfCurrentMonth } },
    });
    const teachersBeforeThisMonth = totalTeachers - teachersThisMonth;
    const teacherPctChange = teachersBeforeThisMonth > 0
      ? Math.round((teachersThisMonth / teachersBeforeThisMonth) * 100)
      : (teachersThisMonth > 0 ? 100 : 0);

    const coursesThisMonth = await prisma.course.count({
      where: { createdAt: { gte: startOfCurrentMonth } },
    });

    const classesThisMonth = await prisma.liveClass.count({
      where: { scheduledAt: { gte: startOfCurrentMonth } },
    });

    payload.stats = [
      { title: 'Total Students', value: totalStudents, change: `+${studentPctChange}% from last month`, isPositive: studentPctChange >= 0 },
      { title: 'Total Teachers', value: totalTeachers, change: `+${teacherPctChange}% from last month`, isPositive: teacherPctChange >= 0 },
      { title: 'Active Courses', value: totalCourses, change: `${coursesThisMonth} newly added`, isPositive: true },
      { title: 'Total Classes', value: totalClasses, change: `${classesThisMonth} scheduled this month`, isPositive: true },
    ];
  } else if (role === 'TEACHER') {
    const courses = await prisma.courseTeacher.findMany({
      where: { teacherId: userId },
      include: { course: { include: { _count: { select: { enrollments: true, tasks: true } } } } },
    });
    const myStudents = courses.reduce((acc, c) => acc + c.course._count.enrollments, 0);
    const teacherClasses = await prisma.liveClass.count({ where: { teacherId: userId } });
    
    // Average attendance for teacher's courses
    const attendances = await prisma.attendance.findMany({ where: { courseId: { in: teacherCourseIds } } });
    const relevantAttendances = attendances.filter(a => a.status !== 'NO_CLASS');
    const presentCount = relevantAttendances.filter(a => a.status === 'PRESENT').length;
    const avgAttendance = relevantAttendances.length > 0 ? Math.round((presentCount / relevantAttendances.length) * 100) : 0;
    
    const tasksAssigned = courses.reduce((acc, c) => acc + c.course._count.tasks, 0);

    payload.stats = [
      { title: 'My Students', value: myStudents, change: '+5% this term', isPositive: true },
      { title: 'My Courses', value: courses.length, change: 'Active this term', isPositive: true },
      { title: 'Total Classes', value: teacherClasses, change: 'Scheduled', isPositive: true },
      { title: 'Avg Attendance', value: `${avgAttendance}%`, change: 'Across courses', isPositive: true },
      { title: 'Assignments', value: tasksAssigned, change: 'Created', isPositive: true },
    ];
  } else {
    const totalTasksAssigned = await prisma.task.count({ where: { assignedStudents: { some: { studentId: userId } } } });
    const submittedTasksCount = await prisma.taskSubmission.count({ where: { studentId: userId } });
    const pendingTasksCount = Math.max(0, totalTasksAssigned - submittedTasksCount);

    const totalQuizzes = await prisma.quiz.count({ where: { courseId: { in: studentCourseIds.length ? studentCourseIds : [''] }, isPublished: true } });
    const attemptedQuizzesCount = await prisma.quizAttempt.count({ where: { studentId: userId } });
    const pendingQuizzesCount = Math.max(0, totalQuizzes - attemptedQuizzesCount);

    const pendingTotal = pendingTasksCount + pendingQuizzesCount;

    const studentClasses = await prisma.liveClass.count({ where: { courseId: { in: studentCourseIds.length ? studentCourseIds : [''] } } });
    
    const attendances = await prisma.attendance.findMany({ where: { studentId: userId } });
    const relevantAttendances = attendances.filter(a => a.status !== 'NO_CLASS');
    const presentCount = relevantAttendances.filter(a => a.status === 'PRESENT').length;
    const myAttendance = relevantAttendances.length > 0 ? Math.round((presentCount / relevantAttendances.length) * 100) : 0;
    
    const completedCourses = await prisma.enrollment.count({ where: { studentId: userId, progress: 100 } });

    payload.stats = [
      { title: 'Enrolled Courses', value: studentEnrollments.length, change: 'On Track', isPositive: true },
      { title: 'Total Classes', value: studentClasses, change: 'Upcoming & Live', isPositive: true },
      { title: 'My Attendance', value: `${myAttendance}%`, change: 'Overall', isPositive: true },
      { title: 'Pending Tasks', value: pendingTotal, change: 'Due Soon', isPositive: false },
      { title: 'Completed Courses', value: completedCourses, change: 'Achieved', isPositive: true },
    ];

    payload.performanceAnalytics = [
      {
        name: 'Activity',
        'Quiz Submitted': attemptedQuizzesCount,
        'Quiz Pending': pendingQuizzesCount,
        'Assignment Submitted': submittedTasksCount,
        'Assignment Pending': pendingTasksCount
      }
    ];
  }

  const monthBuckets = buildMonthBuckets();

  if (role === 'STUDENT') {
    const quizzes = await prisma.quiz.findMany({ where: { courseId: { in: studentCourseIds.length ? studentCourseIds : [''] }, isPublished: true }, select: { createdAt: true } });
    const quizAttempts = await prisma.quizAttempt.findMany({ where: { studentId: userId }, select: { submittedAt: true } });
    
    const tasks = await prisma.task.findMany({ where: { assignedStudents: { some: { studentId: userId } } }, select: { createdAt: true } });
    const taskSubmissions = await prisma.taskSubmission.findMany({ where: { studentId: userId }, select: { submittedAt: true } });

    payload.historicalPerformance = monthBuckets.map((bucket) => {
      const qTotal = quizzes.filter((q: any) => q.createdAt <= bucket.end).length;
      const qSub = quizAttempts.filter((q: any) => q.submittedAt <= bucket.end).length;
      const tTotal = tasks.filter((t: any) => t.createdAt <= bucket.end).length;
      const tSub = taskSubmissions.filter((t: any) => t.submittedAt <= bucket.end).length;
      return {
        name: bucket.name,
        'Quiz Submitted': qSub,
        'Quiz Pending': Math.max(0, qTotal - qSub),
        'Assignment Submitted': tSub,
        'Assignment Pending': Math.max(0, tTotal - tSub),
      };
    });
  }

  if (role === 'ADMIN') {
    const allStudents = await prisma.user.findMany({ where: { role: 'STUDENT' }, select: { createdAt: true } });
    const studentGrowth = monthBuckets.map((b) => ({ key: b.key, name: b.name, students: 0 }));

    for (const s of allStudents) {
      const key = `${s.createdAt.getFullYear()}-${s.createdAt.getMonth()}`;
      const bucket = studentGrowth.find((b) => b.key === key);
      if (bucket) bucket.students += 1;
    }

    let running = 0;
    for (const item of studentGrowth) {
      running += item.students;
      item.students = running;
    }

    payload.studentGrowth = studentGrowth.map(({ name, students }) => ({ name, students }));
  } else if (role === 'TEACHER') {
    if (teacherCourseIds.length === 0) {
      payload.studentGrowth = monthBuckets.map((b) => ({ name: b.name, students: 0 }));
    } else {
      const students = await prisma.user.findMany({
        where: {
          role: 'STUDENT',
          enrollments: { some: { courseId: { in: teacherCourseIds } } },
        },
        select: { createdAt: true },
      });

      const studentGrowth = monthBuckets.map((b) => ({ key: b.key, name: b.name, students: 0 }));
      for (const s of students) {
        const key = `${s.createdAt.getFullYear()}-${s.createdAt.getMonth()}`;
        const bucket = studentGrowth.find((b) => b.key === key);
        if (bucket) bucket.students += 1;
      }

      let running = 0;
      for (const item of studentGrowth) {
        running += item.students;
        item.students = running;
      }

      payload.studentGrowth = studentGrowth.map(({ name, students }) => ({ name, students }));
    }
  } else {
    const growth = monthBuckets.map((b) => ({ key: b.key, name: b.name, students: 0 }));
    for (const e of studentEnrollments) {
      const key = `${e.enrolledAt.getFullYear()}-${e.enrolledAt.getMonth()}`;
      const bucket = growth.find((b) => b.key === key);
      if (bucket) bucket.students += 1;
    }

    let running = 0;
    for (const item of growth) {
      running += item.students;
      item.students = running;
    }

    payload.studentGrowth = growth.map(({ name, students }) => ({ name, students }));
  }

  const attendanceWhere: Record<string, unknown> = {};
  if (role === 'TEACHER') {
    if (teacherCourseIds.length === 0) {
      payload.attendanceTrend = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name) => ({ name, attendance: 0 }));
    } else {
      attendanceWhere.courseId = { in: teacherCourseIds };
    }
  }
  if (role === 'STUDENT') {
    attendanceWhere.studentId = userId;
  }

  if (!payload.attendanceTrend) {
    const attendances = await prisma.attendance.findMany({
      where: attendanceWhere,
      select: { date: true, status: true },
    });

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const attendanceCounts: Record<string, { present: number; total: number }> = {
      Mon: { present: 0, total: 0 },
      Tue: { present: 0, total: 0 },
      Wed: { present: 0, total: 0 },
      Thu: { present: 0, total: 0 },
      Fri: { present: 0, total: 0 },
      Sat: { present: 0, total: 0 },
    };

    for (const att of attendances) {
      if (att.status === 'NO_CLASS') continue;
      const dayName = daysOfWeek[new Date(att.date).getDay()];
      if (attendanceCounts[dayName]) {
        attendanceCounts[dayName].total += 1;
        if (att.status === 'PRESENT') {
          attendanceCounts[dayName].present += 1;
        }
      }
    }

    payload.attendanceTrend = Object.keys(attendanceCounts).map((day) => {
      const { present, total } = attendanceCounts[day];
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      return { name: day, attendance: percentage };
    });
  }

  const courseWhere: Record<string, unknown> = {};
  if (role === 'TEACHER') {
    if (teacherCourseIds.length === 0) {
      payload.courseProgression = [];
    } else {
      courseWhere.id = { in: teacherCourseIds };
    }
  }
  if (role === 'STUDENT') {
    if (studentCourseIds.length === 0) {
      payload.courseProgression = [];
    } else {
      courseWhere.id = { in: studentCourseIds };
    }
  }

  if (!payload.courseProgression) {
    const dbCourses = await prisma.course.findMany({
      where: courseWhere,
      include: {
        enrollments: role === 'STUDENT'
          ? { where: { studentId: userId } }
          : true,
      },
    });

    const allCoursesData = dbCourses.map((c, index) => {
      const avgProgress = c.enrollments.length > 0
        ? Math.round(c.enrollments.reduce((sum, e) => sum + e.progress, 0) / c.enrollments.length)
        : 0;
      const titleWords = c.title.split(' ');
      const shortName = titleWords[0] + (titleWords[1] ? ` ${titleWords[1]}` : '');
      return {
        name: shortName,
        fullName: c.title,
        value: avgProgress,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });

    if (role === 'STUDENT') {
      // For students: show only top 3 actively in-progress courses in the pie chart
      // "In progress" = progress > 0 and < 100; sorted by most recent activity (highest progress first)
      const inProgress = allCoursesData
        .filter((c) => c.value > 0 && c.value < 100)
        .sort((a, b) => b.value - a.value);

      // If fewer than 3 in-progress, fill with courses that have 0% (newly enrolled)
      const notStarted = allCoursesData.filter((c) => c.value === 0);
      const topCourses = [...inProgress, ...notStarted].slice(0, 3);

      // Re-assign colors for consistent display
      payload.courseProgression = topCourses.map((c, i) => ({
        ...c,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }));
      payload.allCourses = allCoursesData;
    } else {
      payload.courseProgression = allCoursesData;
    }
  }

  if (role === 'ADMIN') {
    const dbCourses = await prisma.course.findMany({
      include: {
        enrollments: true,
      },
    });

    payload.topPerformingCourses = dbCourses.map((c) => {
      const avgProgress = c.enrollments.length > 0
        ? Math.round(c.enrollments.reduce((sum, e) => sum + e.progress, 0) / c.enrollments.length)
        : 0;
      return {
        id: c.id,
        title: c.title,
        avgProgress,
        enrollmentCount: c.enrollments.length,
      };
    })
    .sort((a, b) => b.enrollmentCount - a.enrollmentCount || b.avgProgress - a.avgProgress)
    .slice(0, 5);
  }

  const quizWhere: Record<string, unknown> = {};
  if (role === 'TEACHER') {
    if (teacherCourseIds.length === 0) {
      payload.engagementMetrics = [
        { name: 'Week 1', watchTime: 100, quizScore: 0, activeDays: 0 },
        { name: 'Week 2', watchTime: 120, quizScore: 0, activeDays: 0 },
        { name: 'Week 3', watchTime: 150, quizScore: 0, activeDays: 0 },
        { name: 'Week 4', watchTime: 180, quizScore: 0, activeDays: 0 },
      ];
    } else {
      quizWhere.quiz = { courseId: { in: teacherCourseIds } };
    }
  }
  if (role === 'STUDENT') {
    quizWhere.studentId = userId;
  }

  if (!payload.engagementMetrics) {
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: quizWhere,
      select: { percentage: true },
    });

    const avgQuizScore = quizAttempts.length > 0
      ? Math.round(quizAttempts.reduce((sum, q) => sum + q.percentage, 0) / quizAttempts.length)
      : 0;

    payload.engagementMetrics = [
      { name: 'Week 1', watchTime: 100, quizScore: avgQuizScore, activeDays: 4 },
      { name: 'Week 2', watchTime: 120, quizScore: avgQuizScore, activeDays: 5 },
      { name: 'Week 3', watchTime: 150, quizScore: avgQuizScore, activeDays: 5 },
      { name: 'Week 4', watchTime: 180, quizScore: avgQuizScore, activeDays: 6 },
    ];
  }



  const recentActivities: RecentActivity[] = [];

  const enrollmentWhere: Record<string, unknown> = {};
  if (role === 'TEACHER') enrollmentWhere.courseId = { in: teacherCourseIds.length ? teacherCourseIds : [''] };
  if (role === 'STUDENT') enrollmentWhere.studentId = userId;

  const submissionWhere: Record<string, unknown> = {};
  if (role === 'TEACHER') submissionWhere.task = { courseId: { in: teacherCourseIds.length ? teacherCourseIds : [''] } };
  if (role === 'STUDENT') submissionWhere.studentId = userId;

  const attemptWhere: Record<string, unknown> = {};
  if (role === 'TEACHER') attemptWhere.quiz = { courseId: { in: teacherCourseIds.length ? teacherCourseIds : [''] } };
  if (role === 'STUDENT') attemptWhere.studentId = userId;

  const recentEnrollments = await prisma.enrollment.findMany({
    where: enrollmentWhere,
    take: 5,
    orderBy: { enrolledAt: 'desc' },
    include: { student: { select: { name: true } }, course: { select: { title: true } } },
  });

  const recentSubmissions = await prisma.taskSubmission.findMany({
    where: submissionWhere,
    take: 5,
    orderBy: { submittedAt: 'desc' },
    include: { student: { select: { name: true } }, task: { select: { title: true } } },
  });

  const recentAttempts = await prisma.quizAttempt.findMany({
    where: attemptWhere,
    take: 5,
    orderBy: { submittedAt: 'desc' },
    include: { student: { select: { name: true } }, quiz: { select: { title: true } } },
  });

  for (const e of recentEnrollments) {
    recentActivities.push({
      id: `enroll-${e.id}`,
      student: e.student.name,
      action: 'Enrollment',
      details: `Enrolled in ${e.course.title}`,
      time: getRelativeTime(e.enrolledAt),
      timestamp: e.enrolledAt.getTime(),
      status: 'Success',
    });
  }

  for (const s of recentSubmissions) {
    recentActivities.push({
      id: `sub-${s.id}`,
      student: s.student.name,
      action: 'Task Submission',
      details: `Submitted task: ${s.task.title}`,
      time: getRelativeTime(s.submittedAt),
      timestamp: s.submittedAt.getTime(),
      status: s.status === 'REVIEWED' ? 'Success' : 'Submitted',
    });
  }

  for (const q of recentAttempts) {
    recentActivities.push({
      id: `quiz-${q.id}`,
      student: q.student.name,
      action: 'Quiz Attempt',
      details: `Scored ${q.percentage}% on ${q.quiz.title}`,
      time: getRelativeTime(q.submittedAt),
      timestamp: q.submittedAt.getTime(),
      status: 'Completed',
    });
  }

  recentActivities.sort((a, b) => b.timestamp - a.timestamp);
  const slicedActivities = recentActivities.slice(0, 5).map(({ timestamp, ...rest }) => rest);

  if (slicedActivities.length === 0) {
    slicedActivities.push({
      id: 'default',
      student: 'System',
      action: 'Ready',
      details: 'Welcome to CodVedha Hub LMS',
      time: 'Just now',
      status: 'Success',
    });
  }

  payload.recentActivities = slicedActivities;

  // Add Upcoming Classes
  let upcomingClassesWhere: Record<string, unknown> = {
    scheduledAt: { gte: new Date() }
  };
  if (role === 'TEACHER') {
    upcomingClassesWhere.teacherId = userId;
  } else if (role === 'STUDENT') {
    upcomingClassesWhere.courseId = { in: studentCourseIds.length ? studentCourseIds : [''] };
  }

  const upcomingClasses = await prisma.liveClass.findMany({
    where: upcomingClassesWhere,
    take: 4,
    orderBy: { scheduledAt: 'asc' },
    include: { course: { select: { title: true } }, teacher: { select: { name: true } } }
  });

  payload.upcomingClasses = upcomingClasses.map(c => ({
    id: c.id,
    title: c.title,
    courseName: c.course.title,
    teacherName: c.teacher.name,
    scheduledAt: c.scheduledAt,
    meetingLink: c.meetingLink
  }));

  return sendSuccess(res, { data: payload });
}));

router.get('/course-explorer', asyncHandler(async (req: Request, res: Response) => {
  const role = req.user!.role;
  const courseId = req.query.courseId as string;
  const timeRange = req.query.timeRange as string || '30d';

  if (role !== 'ADMIN' && role !== 'TEACHER') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  // Determine start date based on timeRange
  const now = new Date();
  let startDate = new Date();
  if (timeRange === '7d') startDate.setDate(now.getDate() - 7);
  else if (timeRange === '30d') startDate.setDate(now.getDate() - 30);
  else if (timeRange === '90d') startDate.setDate(now.getDate() - 90);
  else startDate = new Date(0); // All time

  const payload: any = {};

  if (!courseId || courseId === 'all') {
    // Overall Platform Stats
    const totalCourses = await prisma.course.count();
    const totalEnrollments = await prisma.enrollment.count();
    const totalClasses = await prisma.liveClass.count();
    
    const attendances = await prisma.attendance.findMany({ where: { status: { not: 'NO_CLASS' }, date: { gte: startDate } } });
    const presentCount = attendances.filter(a => a.status === 'PRESENT').length;
    const overallAttendance = attendances.length > 0 ? Math.round((presentCount / attendances.length) * 100) : 0;
    
    const quizzes = await prisma.quizAttempt.findMany({ select: { percentage: true } });
    const overallQuizAvg = quizzes.length > 0 ? Math.round(quizzes.reduce((acc, q) => acc + q.percentage, 0) / quizzes.length) : 0;
    
    const enrollments = await prisma.enrollment.findMany({ select: { progress: true } });
    const overallCourseCompletion = enrollments.length > 0 ? Math.round(enrollments.reduce((acc, e) => acc + e.progress, 0) / enrollments.length) : 0;
    
    payload.type = 'all';
    payload.stats = {
      totalCourses,
      totalEnrollments,
      totalClasses,
      overallAttendance,
      overallQuizCompletion: overallQuizAvg,
      overallCourseCompletion,
    };
  } else {
    // Specific Course Analytics
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teachers: { include: { teacher: true } },
        enrollments: { include: { student: true } },
        quizzes: { include: { attempts: true } },
        liveClasses: { orderBy: { scheduledAt: 'asc' } }
      }
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const instructor = course.teachers[0]?.teacher?.name || 'N/A';
    const totalEnrolled = course.enrollments.length;
    
    // Active students (e.g. progress > 0)
    const activeStudents = course.enrollments.filter(e => e.progress > 0).length;
    
    const completionRate = totalEnrolled > 0 ? Math.round(course.enrollments.reduce((sum, e) => sum + e.progress, 0) / totalEnrolled) : 0;
    
    const allAttempts = course.quizzes.flatMap(q => q.attempts);
    const quizCompletionRate = allAttempts.length > 0 ? Math.round(allAttempts.reduce((sum, q) => sum + q.percentage, 0) / allAttempts.length) : 0;

    const attendances = await prisma.attendance.findMany({ where: { courseId: course.id, status: { not: 'NO_CLASS' }, date: { gte: startDate } } });
    const presentCount = attendances.filter(a => a.status === 'PRESENT').length;
    const attendancePercentage = attendances.length > 0 ? Math.round((presentCount / attendances.length) * 100) : 0;

    // A. Attendance Trend (Group by date)
    const attMap: Record<string, { present: number, total: number }> = {};
    attendances.forEach(a => {
      const d = a.date.toISOString().split('T')[0];
      if (!attMap[d]) attMap[d] = { present: 0, total: 0 };
      attMap[d].total += 1;
      if (a.status === 'PRESENT') attMap[d].present += 1;
    });
    
    let attendanceTrend = Object.keys(attMap).sort().map(d => ({
      date: new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      attendance: Math.round((attMap[d].present / attMap[d].total) * 100)
    }));

    if (attendanceTrend.length === 0) {
      attendanceTrend = [{ date: 'No Data', attendance: 0 }];
    }

    // B. Quiz Performance
    let quizPerformance = course.quizzes.map(q => {
      const avg = q.attempts.length > 0 ? Math.round(q.attempts.reduce((sum, a) => sum + a.percentage, 0) / q.attempts.length) : 0;
      return { title: q.title.length > 15 ? q.title.substring(0, 15) + '...' : q.title, avgScore: avg, attempts: q.attempts.length };
    });
    
    if (quizPerformance.length === 0) {
       quizPerformance = [{ title: 'No Quizzes', avgScore: 0, attempts: 0 }];
    }

    // C. Student Progress Distribution
    let notStarted = 0, inProgress = 0, completed = 0;
    course.enrollments.forEach(e => {
      if (e.progress === 0) notStarted++;
      else if (e.progress === 100) completed++;
      else inProgress++;
    });
    
    let progressDistribution = [
      { name: 'Not Started', value: notStarted, color: '#F43F5E' },
      { name: 'In Progress', value: inProgress, color: '#38BDF8' },
      { name: 'Completed', value: completed, color: '#10B981' }
    ].filter(item => item.value > 0);
    
    if (progressDistribution.length === 0) {
       progressDistribution = [{ name: 'No Students', value: 1, color: '#94A3B8' }];
    }

    // D. Class Activity Timeline
    const timeline = course.liveClasses.filter(c => c.scheduledAt >= startDate).map(c => ({
      id: c.id,
      title: c.title,
      date: c.scheduledAt,
      isUpcoming: c.scheduledAt > now
    }));

    // Insights
    let mostActiveStudent = 'N/A';
    let atRiskStudent = 'N/A';
    
    if (course.enrollments.length > 0) {
      const sortedByProgress = [...course.enrollments].sort((a, b) => b.progress - a.progress);
      mostActiveStudent = sortedByProgress[0].student.name;
      atRiskStudent = sortedByProgress[sortedByProgress.length - 1].student.name;
    }

    const highestQuizScore = allAttempts.length > 0 ? Math.max(...allAttempts.map(a => a.percentage)) : 0;

    payload.type = 'single';
    payload.overview = {
      courseName: course.title,
      instructor,
      totalEnrolled,
      activeStudents,
      completionRate,
      quizCompletionRate,
      attendancePercentage
    };
    payload.attendanceTrend = attendanceTrend;
    payload.quizPerformance = quizPerformance;
    payload.progressDistribution = progressDistribution;
    payload.timeline = timeline;
    payload.insights = {
      mostActiveStudent,
      atRiskStudent,
      highestQuizScore,
      lowestAttendance: 'N/A' // placeholder
    };
  }

  return sendSuccess(res, { data: payload });
}));

export default router;
