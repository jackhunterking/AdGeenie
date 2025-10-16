"use client"

import { useState } from "react"
import { BarChart3, Download, Filter, Users, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"

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

  const showLeadsCard = leads.length > 0 // This can be controlled by campaign type later

  return (
    <div className="rounded-lg border p-4 space-y-4 bg-transparent border-transparent">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
          <BarChart3 className="h-4 w-4 text-orange-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Results</h2>
        </div>
      </div>

      <div className="space-y-3">
        {showLeadsCard && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            {/* Leads Card Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-orange-600" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold">Leads</h3>
                  <span className="text-sm text-muted-foreground">
                    {leads.length} {leads.length === 1 ? "lead" : "leads"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="gap-1.5 bg-transparent h-7 px-2 text-xs">
                  <Filter className="h-3.5 w-3.5" />
                  Filter
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 bg-transparent h-7 px-2 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </div>
            </div>

            {/* Leads Table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Name</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Email</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Phone</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Date</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2 text-xs font-medium">{lead.name}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{lead.email}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{lead.phone}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{lead.date}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              lead.status === "New" ? "bg-blue-500/10 text-blue-500" : "bg-green-500/10 text-green-500"
                            }`}
                          >
                            {lead.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          {/* Analytics Card Header */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </div>
            <h3 className="text-base font-semibold">Analytics</h3>
          </div>

          {/* Analytics Content */}
          <div className="rounded-lg border border-border bg-muted/20 p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-3">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-sm font-semibold mb-1">Analytics Dashboard</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Campaign performance metrics, conversion rates, and detailed analytics will be displayed here.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
