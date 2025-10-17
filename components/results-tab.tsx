"use client"

import { useState } from "react"
import { BarChart3, Download, Filter, Users, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function ResultsTab() {
  // Mock data - will be replaced with real data from Meta API
  const [leads] = useState([
    {
      id: "1",
      name: "John Smith",
      email: "john.smith@example.com",
      phone: "+1 (555) 123-4567",
      date: "2025-01-10",
      status: "New",
    },
    {
      id: "2",
      name: "Sarah Johnson",
      email: "sarah.j@example.com",
      phone: "+1 (555) 234-5678",
      date: "2025-01-10",
      status: "Contacted",
    },
    {
      id: "3",
      name: "Michael Brown",
      email: "m.brown@example.com",
      phone: "+1 (555) 345-6789",
      date: "2025-01-09",
      status: "New",
    },
  ])

  const hasLeads = leads.length > 0

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold">Results</h2>
          <p className="text-muted-foreground">
            View your campaign performance and collected leads
          </p>
        </div>

        {/* Leads Table Section */}
        <div className="rounded-2xl border-2 border-border bg-card/50 overflow-hidden">
          {/* Leads Header */}
          <div className="flex items-center justify-between p-6 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold">Leads</h3>
                  {hasLeads && (
                    <Badge className="bg-orange-600 text-white hover:bg-orange-700">
                      {leads.length}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {hasLeads ? "Collect info from potential customers" : "No leads collected yet"}
                </p>
              </div>
            </div>
            {hasLeads && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 h-9 px-3">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 h-9 px-3">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
            )}
          </div>

          {/* Leads Table Content */}
          {hasLeads ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">Name</th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">Email</th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">Phone</th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">Date</th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium">{lead.name}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{lead.email}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{lead.phone}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{lead.date}</td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="secondary"
                          className={`${
                            lead.status === "New"
                              ? "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
                              : "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                          }`}
                        >
                          {lead.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-orange-600" />
              </div>
              <h4 className="text-lg font-semibold mb-2">No Leads Yet</h4>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Leads will appear here once your campaign starts generating responses.
              </p>
            </div>
          )}
        </div>

        {/* Analytics Table Section */}
        <div className="rounded-2xl border-2 border-border bg-card/50 overflow-hidden">
          {/* Analytics Header */}
          <div className="flex items-center gap-3 p-6 border-b border-border bg-card">
            <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Analytics</h3>
              <p className="text-sm text-muted-foreground">Campaign performance metrics and insights</p>
            </div>
          </div>

          {/* Analytics Content */}
          <div className="p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
            <h4 className="text-lg font-semibold mb-2">Analytics Dashboard</h4>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Campaign performance metrics, conversion rates, and detailed analytics will be displayed here.
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <BarChart3 className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-left text-sm space-y-1">
              <p className="font-medium text-orange-700 dark:text-orange-400">Real-time Performance Tracking</p>
              <p className="text-orange-600 dark:text-orange-300 text-xs">
                Monitor your campaign performance in real-time. View leads as they come in and track key metrics to optimize your ad strategy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
