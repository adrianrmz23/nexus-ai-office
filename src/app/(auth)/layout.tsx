export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-12">
      <div className="nexus-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute top-[-12rem] left-1/2 h-[28rem] w-[44rem] -translate-x-1/2 rounded-full bg-cyan-400/[0.055] blur-3xl" />
      <div className="relative z-10 flex w-full justify-center">{children}</div>
    </main>
  );
}
