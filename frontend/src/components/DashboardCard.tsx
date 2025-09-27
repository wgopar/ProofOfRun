import React from "react";

interface DashboardCardProps {
  title: string;
  value: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ title, value }) => (
  <div className="bg-white p-6 rounded shadow flex flex-col items-center">
    <div className="text-lg font-semibold text-gray-700 mb-2">{title}</div>
    <div className="text-3xl font-bold text-blue-600">{value}</div>
  </div>
);