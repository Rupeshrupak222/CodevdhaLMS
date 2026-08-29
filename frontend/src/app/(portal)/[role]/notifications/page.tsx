import { Notifications } from '@/screens/Notifications';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notifications | CODVEDHA',
  description: 'View notifications and announcements',
};

export default function NotificationsPage() {
  return <Notifications />;
}
