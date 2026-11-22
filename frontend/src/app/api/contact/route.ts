import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // 1. Record submission in database for Admin Support Desk
    try {
      const supabase = getAdminClient() as any;
      await supabase.from('contact_submissions').insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject?.trim() || 'General Inquiry',
        message: message.trim(),
        status: 'unread',
      });
    } catch (dbError) {
      console.warn('[Contact API] Notice: Could not save to contact_submissions:', dbError);
    }

    // 2. Send email notification if configured
    if (process.env.EMAIL_APP_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'unistudy.ai@gmail.com',
            pass: process.env.EMAIL_APP_PASSWORD,
          },
        });

        const mailOptions = {
          from: 'unistudy.ai@gmail.com',
          to: 'unistudy.ai@gmail.com',
          subject: `New Contact Submission: ${subject || 'No Subject'}`,
          html: `
            <h2>New Message from UniStudy AI Contact Form</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject || 'N/A'}</p>
            <p><strong>Message:</strong></p>
            <blockquote style="border-left: 4px solid #00004E; padding-left: 10px; color: #333;">
              ${message.replace(/\n/g, '<br/>')}
            </blockquote>
          `,
          replyTo: email,
        };

        await transporter.sendMail(mailOptions);
      } catch (mailErr) {
        console.warn('[Contact API] Mail delivery notice:', mailErr);
      }
    }

    return NextResponse.json({ success: true, message: 'Message received by student support.' }, { status: 200 });
  } catch (error: any) {
    console.error('Contact API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process message. Please try again later.' },
      { status: 500 }
    );
  }
}
