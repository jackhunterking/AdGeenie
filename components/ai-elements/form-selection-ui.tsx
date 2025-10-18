"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Plus, Search, Check, Calendar } from "lucide-react";
import { useState } from "react";
import { InstantFormBuilder } from "./instant-form-builder";

interface FormField {
  [key: string]: unknown;
}

type FormSelectionUIProps = {
  onCreateNew: (formData: { name: string; fields: FormField[] }) => void;
  onSelectExisting: (formId: string, formName: string) => void;
  onCancel: () => void;
};

export const FormSelectionUI = ({ 
  onCreateNew, 
  onSelectExisting,
  onCancel 
}: FormSelectionUIProps) => {
  const [mode, setMode] = useState<'choice' | 'select-existing' | 'create-new' | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  // Mock data - will be replaced with API call to Supabase
  const existingForms = [
    {
      id: "form-1",
      name: "Toronto Home Buyers Lead",
      created_time: "2025-01-15T10:30:00Z",
      fields: 3,
    },
    {
      id: "form-2",
      name: "Real Estate Inquiry Form",
      created_time: "2025-01-10T14:20:00Z",
      fields: 3,
    },
    {
      id: "form-3",
      name: "Newsletter Signup",
      created_time: "2025-01-05T09:15:00Z",
      fields: 2,
    },
  ];

  const filteredForms = existingForms.filter((form) =>
    form.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedForm = existingForms.find((f) => f.id === selectedFormId);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Initial choice screen
  if (mode === null) {
    return (
      <div className="border rounded-lg p-6 my-2 bg-card max-w-2xl">
        <p className="mb-4 font-medium text-lg">Choose how to set up your form</p>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Create New Option */}
          <button
            onClick={() => setMode('create-new')}
            className="group flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-blue-500 hover:bg-blue-500/5 transition-all duration-300"
          >
            <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <Plus className="h-8 w-8 text-blue-600" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-semibold">Create New Form</h3>
              <p className="text-xs text-muted-foreground">
                Start fresh with a new instant form
              </p>
            </div>
          </button>

          {/* Use Existing Option */}
          <button
            onClick={() => setMode('select-existing')}
            className="group flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-blue-500 hover:bg-blue-500/5 transition-all duration-300"
          >
            <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-semibold">Use Existing Form</h3>
              <p className="text-xs text-muted-foreground">
                Choose from your saved forms
              </p>
            </div>
          </button>
        </div>

        <Button variant="outline" onClick={onCancel} className="w-full">
          Cancel
        </Button>
      </div>
    );
  }

  // Create new form screen
  if (mode === 'create-new') {
    return (
      <InstantFormBuilder
        onComplete={(formData) => onCreateNew(formData)}
        onCancel={() => setMode(null)}
      />
    );
  }

  // Select existing form screen
  if (mode === 'select-existing') {
    return (
      <div className="border rounded-lg p-6 my-2 bg-card max-w-2xl">
        <div className="mb-4">
          <p className="font-medium text-lg">Select an existing form</p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600" />
          <Input
            placeholder="Search forms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Forms List */}
        <div className="space-y-2 max-h-80 overflow-y-auto mb-4">
          {filteredForms.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
              <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground mb-1">No forms found</p>
              <p className="text-xs text-muted-foreground">
                {searchQuery ? "Try adjusting your search" : "Create your first form to get started"}
              </p>
            </div>
          ) : (
            filteredForms.map((form) => (
              <button
                key={form.id}
                onClick={() => setSelectedFormId(form.id)}
                className={`w-full rounded-lg border p-4 text-left transition-all hover:bg-muted/50 ${
                  selectedFormId === form.id ? "border-blue-500 bg-blue-500/5" : "border-border bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-medium text-foreground">{form.name}</h3>
                      {selectedFormId === form.id && <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      <span>{form.fields} fields</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Created {formatDate(form.created_time)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setMode(null)} className="flex-1">
            Back
          </Button>
          <Button
            onClick={() => {
              if (selectedFormId && selectedForm) {
                onSelectExisting(selectedForm.id, selectedForm.name);
              }
            }}
            disabled={!selectedFormId}
            className="flex-1"
          >
            Use Selected Form
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

