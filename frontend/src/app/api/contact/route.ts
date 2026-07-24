import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Configure Nodemailer transporter with Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'unistudy.ai@gmail.com',
        pass: process.env.EMAIL_APP_PASSWORD, // App Password set in .env.local
      },
    });

    // Email options
    const mailOptions = {
      from: 'unistudy.ai@gmail.com', // Sending from your own email
      to: 'unistudy.ai@gmail.com', // Sending to yourself
      subject: `New Contact Form Submission: ${subject || 'No Subject'}`,
      html: `
        <h2>New Message from UniStudy AI Contact Form</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject || 'N/A'}</p>
        <p><strong>Message:</strong></p>
        <blockquote style="border-left: 4px solid #ccc; padding-left: 10px; color: #555;">
          ${message.replace(/\n/g, '<br/>')}
        </blockquote>
      `,
      replyTo: email, // Replies go straight to the user
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Contact API Error:', error);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again later.' },
      { status: 500 }
    );
  }
}
