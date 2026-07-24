import { redirect } from 'next/navigation';

// Focus timer is now inside the lecture slide viewer.
export default function FocusTimerRedirect() {
  redirect('/dashboard/courses');
}

