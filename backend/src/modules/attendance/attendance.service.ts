import { attendanceRepository } from './attendance.repository';
import { courseRepository } from '../course/course.repository';
import { AppError } from '../../utils/apiError';
import { MarkAttendanceInput, EditAttendanceInput, AttendanceQuery, AttendanceHistoryQuery } from './attendance.validator';

export const attendanceService = {
  getAttendance: async (query: AttendanceQuery, requesterId: string, requesterRole: string) => {
    // Validate access
    if (requesterRole === 'STUDENT') {
      const isEnrolled = await courseRepository.isStudentEnrolled(query.courseId, requesterId);
      if (!isEnrolled) throw AppError.forbidden('Not enrolled in this course');
      // Force studentId to requesterId so they only see their own attendance
      query.studentId = requesterId;
    } else if (requesterRole === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(query.courseId, requesterId);
      if (!isAssigned) throw AppError.forbidden('Not assigned to this course');
    }

    const filters = {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      studentId: query.studentId,
      batchId: query.batchId,
    };

    return attendanceRepository.getAttendance(query.courseId, filters);
  },

  getAttendanceHistory: async (query: AttendanceHistoryQuery, requesterId: string, requesterRole: string) => {
    // Only admin and teacher can view history
    if (requesterRole === 'STUDENT') {
      throw AppError.forbidden('Students cannot access attendance history');
    }

    if (requesterRole === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(query.courseId, requesterId);
      if (!isAssigned) throw AppError.forbidden('Not assigned to this course');
    }

    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '50', 10);
    const skip = (page - 1) * limit;

    const filters = {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      studentId: query.studentId,
      batchId: query.batchId,
      skip,
      take: limit,
    };

    const { records, total } = await attendanceRepository.getAttendanceHistory(query.courseId, filters);
    return {
      records,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  markAttendance: async (input: MarkAttendanceInput, teacherId: string, role: string) => {
    const course = await courseRepository.findById(input.courseId);
    if (!course) throw AppError.notFound('Course not found');

    if (role === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(input.courseId, teacherId);
      if (!isAssigned) throw AppError.forbidden('Can only mark attendance for assigned courses');
    }

    const date = new Date(input.date);
    // Normalize time to midnight UTC for date comparison
    date.setUTCHours(0, 0, 0, 0);

    const enrolledStudents = await courseRepository.getCourseStudents(input.courseId);
    const enrolledIds = enrolledStudents.map(e => e.student.id);

    // Validate that all records belong to enrolled students
    for (const record of input.records) {
      if (!enrolledIds.includes(record.studentId)) {
        throw AppError.badRequest(`Student ${record.studentId} is not enrolled in this course`);
      }
    }

    return attendanceRepository.markAttendance(input.courseId, date, teacherId, input.records as any);
  },

  editAttendance: async (input: EditAttendanceInput, requesterId: string, role: string) => {
    // Only admin and teacher can edit attendance
    if (role === 'STUDENT') {
      throw AppError.forbidden('Students cannot edit attendance');
    }

    const course = await courseRepository.findById(input.courseId);
    if (!course) throw AppError.notFound('Course not found');

    if (role === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(input.courseId, requesterId);
      if (!isAssigned) throw AppError.forbidden('Can only edit attendance for assigned courses');
    }

    const date = new Date(input.date);
    date.setUTCHours(0, 0, 0, 0);

    return attendanceRepository.editAttendance(input.courseId, date, input.records as any);
  },
};
