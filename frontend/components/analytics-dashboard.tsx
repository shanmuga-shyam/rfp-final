"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown } from "lucide-react"

interface AnalyticsDashboardProps {
  workers: Array<{
    id: string
    name: string
    rfps_processed: number
    current_projects: number
  }>
  rfps: Array<{
    id: number
    status: string
    created_at: string
  }>
}

export function AnalyticsDashboard({ workers, rfps }: AnalyticsDashboardProps) {
  // Prepare data for RFPs by status
  const rfpStatusData = [
    { status: "Pending", count: rfps.filter((r) => r.status === "pending").length },
    { status: "In Progress", count: rfps.filter((r) => r.status === "in_progress").length },
    { status: "Assigned", count: rfps.filter((r) => r.status === "assigned").length },
    { status: "Completed", count: rfps.filter((r) => r.status === "completed").length },
  ]

  // Prepare data for employee workload
  const employeeWorkloadData = workers
    .sort((a, b) => b.rfps_processed - a.rfps_processed)
    .slice(0, 6)
    .map((worker) => ({
      name: worker.name.split(" ")[0],
      processed: worker.rfps_processed,
      current: worker.current_projects,
    }))

  // Monthly trend data (simulated)
  const monthlyTrendData = [
    { month: "Jan", rfps: 4, completed: 2 },
    { month: "Feb", rfps: 6, completed: 3 },
    { month: "Mar", rfps: 8, completed: 5 },
    { month: "Apr", rfps: 12, completed: 8 },
    { month: "May", rfps: 14, completed: 10 },
    { month: "Jun", rfps: rfps.length, completed: rfps.filter((r) => r.status === "completed").length },
  ]

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"]

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RFPs by Status */}
        <Card className="rounded-2xl shadow-lg dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              RFPs by Status
            </CardTitle>
            <CardDescription className="dark:text-gray-400">Distribution of RFP processing status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rfpStatusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="status" stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Employee Workload */}
        <Card className="rounded-2xl shadow-lg dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
              <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
              Employee Workload
            </CardTitle>
            <CardDescription className="dark:text-gray-400">RFPs processed per employee</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={employeeWorkloadData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
                <Bar dataKey="processed" fill="hsl(var(--chart-2))" radius={[8, 8, 0, 0]} />
                <Bar dataKey="current" fill="hsl(var(--chart-3))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card className="rounded-2xl shadow-lg dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-800 dark:text-gray-100">Monthly RFP Processing Trend</CardTitle>
          <CardDescription className="dark:text-gray-400">RFPs received vs completed over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--foreground))" />
              <YAxis stroke="hsl(var(--foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
              <Bar dataKey="rfps" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
              <Bar dataKey="completed" fill="hsl(var(--chart-4))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </section>
  )
}
