"use client";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard Overview</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Render your dashboard components here */}
        <div className="p-4 border rounded shadow-sm">Card 1</div>
        <div className="p-4 border rounded shadow-sm">Card 2</div>
        <div className="p-4 border rounded shadow-sm">Card 3</div>
        <div className="p-4 border rounded shadow-sm">Card 4</div>
      </div>
    </div>
  );
}
