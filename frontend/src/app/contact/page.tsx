"use client";

import React, { useState } from 'react';
import { MarketingNavbar } from '@/components/layout/MarketingNavbar';
import { MarketingFooter } from '@/components/layout/MarketingFooter';
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
    <div className='min-h-screen bg-[#F8F9FD] dark:bg-[#040416] transition-colors' style={{ fontFamily: "Inter, sans-serif" }}>
      <MarketingNavbar />
      
      {/* Background ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FEF8E7] dark:bg-[#D89A06]/10 rounded-full blur-[120px] pointer-events-none opacity-60" />

      <div className='py-24 px-6 relative z-10'>
        <div className='max-w-6xl mx-auto'>
          
          <div className='grid lg:grid-cols-2 gap-10 md:gap-16 items-start'>
            
            {/* Left Column: Contact Info Section */}
            <div className='w-full'>
              <h2 className='text-center text-[#D89A06] mb-6 tracking-wide font-medium text-[11px] uppercase'>Contact Info Section</h2>
              <div className='bg-white dark:bg-[#0A0A28] border border-[#D9E0EE] dark:border-white/10 rounded-3xl p-10 md:p-14 shadow-sm'>
                <h1 className='text-4xl md:text-5xl font-bold mb-6 text-[#00004E] dark:text-white' style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Get in Touch</h1>
                <p className='text-[#4B526B] dark:text-[#A3A8C2] text-lg leading-relaxed mb-12'>
                  We're here to answer any questions about UniStudy. Drop us a line and our support team will get back to you with the guidance you need to ace your exams.
                </p>

                <div className='space-y-8'>
                  <div className='flex items-center gap-5'>
                    <div className="w-12 h-12 rounded-xl bg-[#FEF8E7] dark:bg-[#00004E]/50 flex items-center justify-center text-[#00004E] dark:text-[#D89A06]">
                      <Mail className='w-5 h-5' />
                    </div>
                    <span className='text-lg font-medium text-[#00004E] dark:text-white'>unistudy.ai@gmail.com</span>
                  </div>
                  <div className='flex items-center gap-5'>
                    <div className="w-12 h-12 rounded-xl bg-[#FEF8E7] dark:bg-[#00004E]/50 flex items-center justify-center text-[#00004E] dark:text-[#D89A06]">
                      <MapPin className='w-5 h-5' />
                    </div>
                    <span className='text-lg font-medium text-[#00004E] dark:text-white'>Accra, Ghana</span>
                  </div>
                  <div className='flex items-center gap-5'>
                    <div className="w-12 h-12 rounded-xl bg-[#FEF8E7] dark:bg-[#00004E]/50 flex items-center justify-center text-[#00004E] dark:text-[#D89A06]">
                      <Phone className='w-5 h-5' />
                    </div>
                    <span className='text-lg font-medium text-[#00004E] dark:text-white'>+233 59 272 2997</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Contact Form */}
            <div className='w-full'>
              <h2 className='text-center text-[#D89A06] mb-6 tracking-wide font-medium text-[11px] uppercase'>Contact Form</h2>
              <div className='bg-white dark:bg-[#070724] border border-[#D9E0EE] dark:border-white/10 rounded-3xl p-10 md:p-14 shadow-sm'>
                <form onSubmit={handleSubmit} className='space-y-6'>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Your Name*" 
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className='w-full bg-[#F0F3F9] dark:bg-white/5 border border-[#D9E0EE] dark:border-white/10 rounded-xl px-5 py-4 text-[#00004E] dark:text-white placeholder:text-[#717894] focus:outline-none focus:ring-2 focus:ring-[#D89A06] transition-all'
                    />
                  </div>
                  <div>
                    <input 
                      type="email" 
                      placeholder="Email Address*" 
                      required
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className='w-full bg-[#F0F3F9] dark:bg-white/5 border border-[#D9E0EE] dark:border-white/10 rounded-xl px-5 py-4 text-[#00004E] dark:text-white placeholder:text-[#717894] focus:outline-none focus:ring-2 focus:ring-[#D89A06] transition-all'
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Subject (Optional)" 
                      value={formData.subject}
                      onChange={e => setFormData({...formData, subject: e.target.value})}
                      className='w-full bg-[#F0F3F9] dark:bg-white/5 border border-[#D9E0EE] dark:border-white/10 rounded-xl px-5 py-4 text-[#00004E] dark:text-white placeholder:text-[#717894] focus:outline-none focus:ring-2 focus:ring-[#D89A06] transition-all'
                    />
                  </div>
                  <div>
                    <textarea 
                      placeholder="Write your message..." 
                      required
                      rows={5}
                      value={formData.message}
                      onChange={e => setFormData({...formData, message: e.target.value})}
                      className='w-full bg-[#F0F3F9] dark:bg-white/5 border border-[#D9E0EE] dark:border-white/10 rounded-xl px-5 py-4 text-[#00004E] dark:text-white placeholder:text-[#717894] focus:outline-none focus:ring-2 focus:ring-[#D89A06] transition-all resize-none'
                    ></textarea>
                  </div>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className='w-full py-4 rounded-full font-bold text-lg text-white bg-[#00004E] hover:bg-[#000038] dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#B88205] transition-colors shadow-md disabled:opacity-50'
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </button>
                </form>
              </div>
            </div>

          </div>
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}
