import nodemailer from 'nodemailer';
import { env } from '../config/env';

// Create a transporter using SMTP config from environment
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

/**
 * Sends email notification to students when a live class is scheduled
 */
export const sendLiveClassScheduledEmail = async (
  students: { email: string; name: string }[],
  classDetails: {
    title: string;
    courseName: string;
    batchName?: string | null;
    scheduledAt: Date;
    duration?: string | null;
    meetingLink: string;
    teacherName: string;
  }
) => {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    console.warn(`[Email Service] SMTP not configured. Live class notification skipped.`);
    return;
  }

  if (students.length === 0) return;

  const scheduledDate = new Date(classDetails.scheduledAt);
  const formattedDate = scheduledDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = scheduledDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const batchInfo = classDetails.batchName ? `<p style="margin: 5px 0;"><strong>Batch:</strong> ${classDetails.batchName}</p>` : '';
  const durationInfo = classDetails.duration ? `<p style="margin: 5px 0;"><strong>Duration:</strong> ${classDetails.duration}</p>` : '';

  const htmlTemplate = (studentName: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background-color: #ffb900; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h2 style="color: #1e293b; margin: 0;">📅 New Live Class Scheduled</h2>
      </div>
      <div style="padding: 20px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Hello <strong>${studentName}</strong>,</p>
        <p>A new live class has been scheduled for you. Here are the details:</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e293b;">${classDetails.title}</h3>
          <p style="margin: 5px 0;"><strong>Course:</strong> ${classDetails.courseName}</p>
          ${batchInfo}
          <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedTime}</p>
          ${durationInfo}
          <p style="margin: 5px 0;"><strong>Instructor:</strong> ${classDetails.teacherName}</p>
        </div>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${classDetails.meetingLink}" style="background-color: #ffb900; color: #1e293b; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
            Join Class
          </a>
        </div>
        
        <p style="color: #64748b; font-size: 14px;">Please join the class on time. You can also access it from your dashboard at <a href="https://my.codvedha.com" style="color: #0366d6;">my.codvedha.com</a></p>
        
        <br/>
        <p style="margin-bottom: 0;">Regards,</p>
        <p style="margin-top: 5px; font-weight: bold;">CodVedha Team</p>
      </div>
    </div>
  `;

  // Send emails in parallel (batched to avoid overloading SMTP)
  const BATCH_SIZE = 10;
  for (let i = 0; i < students.length; i += BATCH_SIZE) {
    const batch = students.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map(async (student) => {
        try {
          await transporter.sendMail({
            from: `"CodVedha LMS" <${env.EMAIL_FROM}>`,
            to: student.email,
            subject: `Live Class Scheduled: ${classDetails.title}`,
            html: htmlTemplate(student.name),
          });
          console.log(`[Email Service] Live class notification sent to ${student.email}`);
        } catch (error) {
          console.error(`[Email Service] Failed to send live class notification to ${student.email}:`, error);
        }
      })
    );
  }
};

/**
 * Sends a welcome email with credentials to newly created users
 */
export const sendWelcomeEmail = async (
  email: string,
  name: string,
  rawPassword: string,
  role: string
) => {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    console.warn(`[Email Service] SMTP not configured. Welcome email to ${email} was skipped.`);
    return;
  }

  const roleText = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background-color: #ffb900; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h2 style="color: #1e293b; margin: 0;">Welcome to CodVedha LMS</h2>
      </div>
      <div style="padding: 20px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your account has been successfully created. Welcome aboard!</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e293b;">Login Credentials</h3>
          <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #0366d6;">${email}</a></p>
          <p style="margin: 5px 0;"><strong>Password:</strong> ${rawPassword}</p>
          <p style="margin: 5px 0;"><strong>Role:</strong> ${roleText}</p>
        </div>
        
        <p><strong>Login Portal:</strong> <br/>
           <a href="https://my.codvedha.com" style="color: #0366d6;">my.codvedha.com</a>
        </p>
        
        <p style="color: #64748b; font-size: 14px;">Please log in and change your password after your first login.</p>
        
        <br/>
        <p style="margin-bottom: 0;">Regards,</p>
        <p style="margin-top: 5px; font-weight: bold;">CodVedha Team</p>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"CodVedha LMS" <${env.EMAIL_FROM}>`,
      to: email,
      subject: "Welcome to CodVedha LMS",
      html: htmlTemplate,
    });
    console.log(`[Email Service] Welcome email sent to ${email} (Message ID: ${info.messageId})`);
  } catch (error) {
    console.error(`[Email Service] Failed to send welcome email to ${email}:`, error);
  }
};
