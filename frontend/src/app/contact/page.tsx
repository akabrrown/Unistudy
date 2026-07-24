"use client";

import React, { useState } from 'react';
import { MarketingNavbar } from '@/components/layout/MarketingNavbar';
import { Mail, MapPin, Phone } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert("Message sent! We'll get back to you shortly.");
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        alert("Failed to send message. Please try again later.");
      }
    } catch (error) {
      alert("An error occurred. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='min-h-screen bg-[#FAF8FF] dark:bg-[#0F0C29] transition-colors' style={{ fontFamily: "Inter, sans-serif" }}>
      <MarketingNavbar />
      
      {/* Background ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#EDE7F6] dark:bg-[#5B2D8E]/20 rounded-full blur-[120px] pointer-events-none opacity-50" />

      <div className='py-24 px-6 relative z-10'>
        <div className='max-w-6xl mx-auto'>
          
          <div className='grid lg:grid-cols-2 gap-10 md:gap-16 items-start'>
            
            {/* Left Column: Contact Info Section */}
            <div className='w-full'>
              <h2 className='text-center text-[#9B72CF] mb-6 tracking-wide font-medium text-[11px] uppercase uppercase'>Contact Info Section</h2>
              <div className='bg-white dark:bg-[#1A0A2E] border border-[#D1C4E9] dark:border-white/10 rounded-3xl p-10 md:p-14 shadow-sm'>
                <h1 className='text-4xl md:text-5xl font-bold mb-6 text-[#1A0A2E] dark:text-white' style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Get in Touch</h1>
                <p className='text-[#6B5A8A] dark:text-[#B39DDB] text-lg leading-relaxed mb-12'>
                  We're here to answer any questions about UniStudy. Drop us a line and our support team will get back to you with the guidance you need to ace your exams.
                </p>

                <div className='space-y-8'>
                  <div className='flex items-center gap-5'>
                    <div className="w-12 h-12 rounded-xl bg-[#EDE7F6] dark:bg-[#5B2D8E]/40 flex items-center justify-center text-[#5B2D8E]">
                      <Mail className='w-5 h-5' />
                    </div>
                    <span className='text-lg font-medium text-[#1A0A2E] dark:text-white'>unistudy.ai@gmail.com</span>
                  </div>
                  <div className='flex items-center gap-5'>
                    <div className="w-12 h-12 rounded-xl bg-[#EDE7F6] dark:bg-[#5B2D8E]/40 flex items-center justify-center text-[#5B2D8E]">
                      <MapPin className='w-5 h-5' />
                    </div>
                    <span className='text-lg font-medium text-[#1A0A2E] dark:text-white'>Accra, Ghana</span>
                  </div>
                  <div className='flex items-center gap-5'>
                    <div className="w-12 h-12 rounded-xl bg-[#EDE7F6] dark:bg-[#5B2D8E]/40 flex items-center justify-center text-[#5B2D8E]">
                      <Phone className='w-5 h-5' />
                    </div>
                    <span className='text-lg font-medium text-[#1A0A2E] dark:text-white'>+233 59 272 2997</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Contact Form */}
            <div className='w-full'>
              <h2 className='text-center text-[#9B72CF] mb-6 tracking-wide font-medium text-[11px] uppercase uppercase'>Contact Form</h2>
              <div className='bg-white dark:bg-[#1A0A2E] border border-[#D1C4E9] dark:border-white/10 rounded-3xl p-10 md:p-14 shadow-sm'>
                <form onSubmit={handleSubmit} className='space-y-6'>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Your Name*" 
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className='w-full bg-[#F5F3FA] dark:bg-white/5 border border-[#D1C4E9] dark:border-white/10 rounded-xl px-5 py-4 text-[#1A0A2E] dark:text-white placeholder:text-[#9E8CB5] focus:outline-none focus:ring-2 focus:ring-[#9B72CF] transition-all'
                    />
                  </div>
                  <div>
                    <input 
                      type="email" 
                      placeholder="Email Address*" 
                      required
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className='w-full bg-[#F5F3FA] dark:bg-white/5 border border-[#D1C4E9] dark:border-white/10 rounded-xl px-5 py-4 text-[#1A0A2E] dark:text-white placeholder:text-[#9E8CB5] focus:outline-none focus:ring-2 focus:ring-[#9B72CF] transition-all'
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Subject (Optional)" 
                      value={formData.subject}
                      onChange={e => setFormData({...formData, subject: e.target.value})}
                      className='w-full bg-[#F5F3FA] dark:bg-white/5 border border-[#D1C4E9] dark:border-white/10 rounded-xl px-5 py-4 text-[#1A0A2E] dark:text-white placeholder:text-[#9E8CB5] focus:outline-none focus:ring-2 focus:ring-[#9B72CF] transition-all'
                    />
                  </div>
                  <div>
                    <textarea 
                      placeholder="Write your message..." 
                      required
                      rows={5}
                      value={formData.message}
                      onChange={e => setFormData({...formData, message: e.target.value})}
                      className='w-full bg-[#F5F3FA] dark:bg-white/5 border border-[#D1C4E9] dark:border-white/10 rounded-xl px-5 py-4 text-[#1A0A2E] dark:text-white placeholder:text-[#9E8CB5] focus:outline-none focus:ring-2 focus:ring-[#9B72CF] transition-all resize-none'
                    ></textarea>
                  </div>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className='w-full py-4 rounded-full font-bold text-lg text-white bg-[#5B2D8E] hover:bg-[#3D1A6E] transition-colors shadow-md disabled:opacity-50'
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </button>
                </form>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
