"use client";

import { redirect } from 'next/navigation';

type RoleIndexPageProps = {
  params: Promise<{
    role: string;
  }>;
};

export default async function RoleIndexPage({ params }: RoleIndexPageProps) {
  const { role } = await params;
  redirect(`/${role}/dashboard`);
}
