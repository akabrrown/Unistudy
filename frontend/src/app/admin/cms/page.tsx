'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
  Star,
  Quote,
  HelpCircle,
  Megaphone,
  Save,
  X,
  Search,
  Sliders,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { toast } from 'sonner';

interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  display_order: number;
  is_published: boolean;
}

interface Testimonial {
  id: string;
  student_name: string;
  student_role: string;
  program: string | null;
  content: string;
  rating: number;
  is_featured: boolean;
  is_approved: boolean;
}

interface PlatformQuote {
  id: string;
  quote: string;
  author: string;
  theme: string;
  scheduled_date: string | null;
  is_active: boolean;
}

export default function AdminCmsPage() {
  const [activeTab, setActiveTab] = useState<'faqs' | 'testimonials' | 'quotes'>('faqs');
  const [loading, setLoading] = useState(true);

  // FAQs State
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [faqForm, setFaqForm] = useState({ category: 'General', question: '', answer: '', display_order: 1, is_published: true });

  // Testimonials State
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [testForm, setTestForm] = useState({ student_name: '', student_role: 'UPSA Student', program: '', content: '', rating: 5, is_featured: true, is_approved: true });

  // Quotes State
  const [quotes, setQuotes] = useState<PlatformQuote[]>([]);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ quote: '', author: 'Unknown', theme: 'Excellence', is_active: true });

  // Delete Confirmation Dialog
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [faqsRes, testRes, quotesRes] = await Promise.all([
        fetch('/api/admin/cms/faqs').then((r) => r.json()),
        fetch('/api/admin/cms/testimonials').then((r) => r.json()),
        fetch('/api/admin/cms/quotes').then((r) => r.json()),
      ]);

      setFaqs(faqsRes.faqs || []);
      setTestimonials(testRes.testimonials || []);
      setQuotes(quotesRes.quotes || []);
    } catch {
      toast.error('Failed to load CMS content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Save FAQ
  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingFaq ? 'PUT' : 'POST';
      const body = editingFaq ? { ...faqForm, id: editingFaq.id } : faqForm;
      const res = await fetch('/api/admin/cms/faqs', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(editingFaq ? 'FAQ updated successfully' : 'FAQ created');
      setFaqModalOpen(false);
      setEditingFaq(null);
      setFaqForm({ category: 'General', question: '', answer: '', display_order: 1, is_published: true });
      loadAll();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    }
  };

  // Delete FAQ
  const handleDeleteFaq = (id: string) => {
    setDeleteConfirm({
      open: true,
      title: 'Delete FAQ entry?',
      description: 'This removes the question from the public landing page and student helpdesk immediately.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/cms/faqs?id=${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error();
          toast.success('FAQ deleted');
          setFaqs((prev) => prev.filter((f) => f.id !== id));
          setDeleteConfirm(null);
        } catch {
          toast.error('Failed to delete FAQ');
        }
      },
    });
  };

  // Save Testimonial
  const handleSaveTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingTestimonial ? 'PUT' : 'POST';
      const body = editingTestimonial ? { ...testForm, id: editingTestimonial.id } : testForm;
      const res = await fetch('/api/admin/cms/testimonials', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(editingTestimonial ? 'Testimonial updated' : 'Testimonial added');
      setTestModalOpen(false);
      setEditingTestimonial(null);
      setTestForm({ student_name: '', student_role: 'UPSA Student', program: '', content: '', rating: 5, is_featured: true, is_approved: true });
      loadAll();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    }
  };

  // Delete Testimonial
  const handleDeleteTestimonial = (id: string) => {
    setDeleteConfirm({
      open: true,
      title: 'Delete student testimonial?',
      description: 'This permanently removes the student review from the landing page carousel.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/cms/testimonials?id=${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error();
          toast.success('Testimonial deleted');
          setTestimonials((prev) => prev.filter((t) => t.id !== id));
          setDeleteConfirm(null);
        } catch {
          toast.error('Failed to delete testimonial');
        }
      },
    });
  };

  // Save Quote
  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/cms/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Quote added to platform rotation');
      setQuoteModalOpen(false);
      setQuoteForm({ quote: '', author: 'Unknown', theme: 'Excellence', is_active: true });
      loadAll();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    }
  };

  // Delete Quote
  const handleDeleteQuote = (id: string) => {
    setDeleteConfirm({
      open: true,
      title: 'Delete motivational quote?',
      description: 'This removes the quote from the daily student dashboard rotation.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/cms/quotes?id=${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error();
          toast.success('Quote deleted');
          setQuotes((prev) => prev.filter((q) => q.id !== id));
          setDeleteConfirm(null);
        } catch {
          toast.error('Failed to delete quote');
        }
      },
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <AdminPageHeader
        title="Public Site CMS"
        count={faqs.length + testimonials.length + quotes.length}
        subtitle="Manage dynamic landing page FAQs, student reviews, and daily academic quotes live."
        actions={
          <>
            <Button
              onClick={loadAll}
              variant="outline"
              size="sm"
              disabled={loading}
              className="gap-1.5 cursor-pointer text-xs h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {activeTab === 'faqs' && (
              <Button
                onClick={() => {
                  setEditingFaq(null);
                  setFaqForm({ category: 'General', question: '', answer: '', display_order: faqs.length + 1, is_published: true });
                  setFaqModalOpen(true);
                }}
                size="sm"
                className="gap-1.5 bg-[#00004E] text-[#FFFFFF] dark:bg-[#D89A06] dark:text-[#00004E] hover:bg-[#00003E] cursor-pointer text-xs font-semibold h-9"
              >
                <Plus className="w-3.5 h-3.5" />
                Add FAQ
              </Button>
            )}
            {activeTab === 'testimonials' && (
              <Button
                onClick={() => {
                  setEditingTestimonial(null);
                  setTestForm({ student_name: '', student_role: 'UPSA Student', program: '', content: '', rating: 5, is_featured: true, is_approved: true });
                  setTestModalOpen(true);
                }}
                size="sm"
                className="gap-1.5 bg-[#00004E] text-[#FFFFFF] dark:bg-[#D89A06] dark:text-[#00004E] hover:bg-[#00003E] cursor-pointer text-xs font-semibold h-9"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Testimonial
              </Button>
            )}
            {activeTab === 'quotes' && (
              <Button
                onClick={() => setQuoteModalOpen(true)}
                size="sm"
                className="gap-1.5 bg-[#00004E] text-[#FFFFFF] dark:bg-[#D89A06] dark:text-[#00004E] hover:bg-[#00003E] cursor-pointer text-xs font-semibold h-9"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Quote
              </Button>
            )}
          </>
        }
      />

      {/* Metric Cards acting as quick tab switchers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AdminMetricCard
          label="Knowledgebase FAQs"
          value={faqs.length}
          subtext={`${faqs.filter((f) => f.is_published).length} published live`}
          icon={HelpCircle}
          active={activeTab === 'faqs'}
          onClick={() => setActiveTab('faqs')}
        />
        <AdminMetricCard
          label="Student Testimonials"
          value={testimonials.length}
          subtext={`${testimonials.filter((t) => t.is_featured).length} featured on landing`}
          icon={Star}
          active={activeTab === 'testimonials'}
          onClick={() => setActiveTab('testimonials')}
        />
        <AdminMetricCard
          label="Motivational Quotes"
          value={quotes.length}
          subtext="Daily dashboard rotation"
          icon={Quote}
          active={activeTab === 'quotes'}
          onClick={() => setActiveTab('quotes')}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border/80">
        <button
          onClick={() => setActiveTab('faqs')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'faqs'
              ? 'border-[#00004E] dark:border-[#D89A06] text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-[#D89A06]" />
          Knowledgebase FAQs ({faqs.length})
        </button>
        <button
          onClick={() => setActiveTab('testimonials')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'testimonials'
              ? 'border-[#00004E] dark:border-[#D89A06] text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Star className="w-4 h-4 text-[#D89A06]" />
          Testimonials &amp; Reviews ({testimonials.length})
        </button>
        <button
          onClick={() => setActiveTab('quotes')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'quotes'
              ? 'border-[#00004E] dark:border-[#D89A06] text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Quote className="w-4 h-4 text-[#D89A06]" />
          Motivational Quotes ({quotes.length})
        </button>
      </div>

      {/* TAB 1: FAQs */}
      {activeTab === 'faqs' && (
        <div className="space-y-4">
          <div className="grid gap-3">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="p-4 rounded-xl border border-border bg-card flex items-start justify-between gap-4 transition-all hover:border-primary/40 shadow-xs"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-[#D89A06] border-[#D89A06]/30">
                      {faq.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">Order #{faq.display_order}</span>
                    <Badge
                      className={`text-[10px] font-semibold ${
                        faq.is_published
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {faq.is_published ? 'Published Live' : 'Draft'}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{faq.question}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{faq.answer}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    onClick={() => {
                      setEditingFaq(faq);
                      setFaqForm({
                        category: faq.category,
                        question: faq.question,
                        answer: faq.answer,
                        display_order: faq.display_order,
                        is_published: faq.is_published,
                      });
                      setFaqModalOpen(true);
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteFaq(faq.id)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: TESTIMONIALS */}
      {activeTab === 'testimonials' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testimonials.map((test) => (
              <div
                key={test.id}
                className="p-5 rounded-xl border border-border bg-card flex flex-col justify-between space-y-3 hover:border-primary/40 transition-all shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: test.rating || 5 }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-[#D89A06] text-[#D89A06]" />
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {test.is_featured && (
                        <Badge className="bg-[#D89A06]/15 text-[#D89A06] border-[#D89A06]/30 text-[10px]">
                          Featured
                        </Badge>
                      )}
                      <Badge
                        className={`text-[10px] ${
                          test.is_approved
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/15 text-amber-600'
                        }`}
                      >
                        {test.is_approved ? 'Approved' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-foreground/90 italic leading-relaxed line-clamp-4">
                    &ldquo;{test.content}&rdquo;
                  </p>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{test.student_name}</h4>
                    <p className="text-[11px] text-muted-foreground">{test.program || test.student_role}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => {
                        setEditingTestimonial(test);
                        setTestForm({
                          student_name: test.student_name,
                          student_role: test.student_role,
                          program: test.program || '',
                          content: test.content,
                          rating: test.rating,
                          is_featured: test.is_featured,
                          is_approved: test.is_approved,
                        });
                        setTestModalOpen(true);
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteTestimonial(test.id)}
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MOTIVATIONAL QUOTES */}
      {activeTab === 'quotes' && (
        <div className="space-y-4">
          <div className="grid gap-3">
            {quotes.map((q) => (
              <div
                key={q.id}
                className="p-4 rounded-xl border border-border bg-card flex items-start justify-between gap-4 hover:border-primary/40 transition-all shadow-xs"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] text-[#D89A06] border-[#D89A06]/30 font-semibold">
                      {q.theme || 'Excellence'}
                    </Badge>
                    <span className="text-xs font-bold text-muted-foreground">— {q.author}</span>
                  </div>
                  <p className="text-xs text-foreground font-medium italic">&ldquo;{q.quote}&rdquo;</p>
                </div>
                <Button
                  onClick={() => handleDeleteQuote(q.id)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQ DIALOG */}
      <Dialog open={faqModalOpen} onOpenChange={setFaqModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingFaq ? 'Edit FAQ Item' : 'Create Knowledgebase FAQ'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Published FAQs appear immediately on the public landing page and student help center.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveFaq} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Category</label>
                <Input
                  value={faqForm.category}
                  onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                  placeholder="General, Billing, Past Papers"
                  required
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Display Order</label>
                <Input
                  type="number"
                  value={faqForm.display_order}
                  onChange={(e) => setFaqForm({ ...faqForm, display_order: parseInt(e.target.value) || 1 })}
                  className="h-9 text-xs tabular-nums"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Question</label>
              <Input
                value={faqForm.question}
                onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                placeholder="e.g. How does the AI tutor grade past papers?"
                required
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Answer</label>
              <Textarea
                value={faqForm.answer}
                onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                placeholder="Provide clear, student-friendly guidance..."
                rows={4}
                required
                className="text-xs"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="is_published"
                checked={faqForm.is_published}
                onCheckedChange={(checked) => setFaqForm({ ...faqForm, is_published: Boolean(checked) })}
              />
              <label htmlFor="is_published" className="text-xs font-medium text-foreground cursor-pointer">
                Publish publicly on landing page immediately
              </label>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setFaqModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] font-semibold">
                Save FAQ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* TESTIMONIAL DIALOG */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingTestimonial ? 'Edit Student Review' : 'Add Student Testimonial'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Curate verified UPSA student testimonials for the public landing showcase.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTestimonial} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Student Full Name</label>
                <Input
                  value={testForm.student_name}
                  onChange={(e) => setTestForm({ ...testForm, student_name: e.target.value })}
                  placeholder="e.g. Ama Serwaa"
                  required
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Role / Year</label>
                <Input
                  value={testForm.student_role}
                  onChange={(e) => setTestForm({ ...testForm, student_role: e.target.value })}
                  placeholder="Level 300 Scholar"
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Academic Programme</label>
              <Input
                value={testForm.program}
                onChange={(e) => setTestForm({ ...testForm, program: e.target.value })}
                placeholder="e.g. BSc Information Technology Management"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Testimonial Quote</label>
              <Textarea
                value={testForm.content}
                onChange={(e) => setTestForm({ ...testForm, content: e.target.value })}
                placeholder="How UniStudy helped their exam preparation..."
                rows={3}
                required
                className="text-xs"
              />
            </div>
            <div className="flex items-center gap-5 pt-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="test_featured"
                  checked={testForm.is_featured}
                  onCheckedChange={(checked) => setTestForm({ ...testForm, is_featured: Boolean(checked) })}
                />
                <label htmlFor="test_featured" className="text-xs font-medium text-foreground cursor-pointer">
                  Feature on Landing
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="test_approved"
                  checked={testForm.is_approved}
                  onCheckedChange={(checked) => setTestForm({ ...testForm, is_approved: Boolean(checked) })}
                />
                <label htmlFor="test_approved" className="text-xs font-medium text-foreground cursor-pointer">
                  Approved for Display
                </label>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setTestModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] font-semibold">
                Save Testimonial
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QUOTE DIALOG */}
      <Dialog open={quoteModalOpen} onOpenChange={setQuoteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Daily Motivational Quote</DialogTitle>
            <DialogDescription className="text-xs">
              Displayed inside the student command center header rotation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveQuote} className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Quote</label>
              <Textarea
                value={quoteForm.quote}
                onChange={(e) => setQuoteForm({ ...quoteForm, quote: e.target.value })}
                placeholder="Inspiring quote for students..."
                rows={3}
                required
                className="text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Author</label>
                <Input
                  value={quoteForm.author}
                  onChange={(e) => setQuoteForm({ ...quoteForm, author: e.target.value })}
                  placeholder="e.g. Kofi Annan"
                  required
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Theme</label>
                <Input
                  value={quoteForm.theme}
                  onChange={(e) => setQuoteForm({ ...quoteForm, theme: e.target.value })}
                  placeholder="Focus, Resilience"
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setQuoteModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] font-semibold">
                Add to Rotation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={!!deleteConfirm?.open}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title={deleteConfirm?.title || ''}
        description={deleteConfirm?.description || ''}
        confirmLabel="Delete"
        onConfirm={() => deleteConfirm?.onConfirm()}
      />
    </div>
  );
}
