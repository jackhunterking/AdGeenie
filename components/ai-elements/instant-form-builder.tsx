"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User, Mail, Phone, MessageSquare, Trash2, Plus, CheckCircle2 } from "lucide-react";
import { useState } from "react";

type FormField = {
  id: string;
  type: 'full_name' | 'email' | 'phone_number' | 'custom';
  label: string;
  required: boolean;
  placeholder?: string;
};

type InstantFormBuilderProps = {
  onComplete: (formData: { name: string; fields: FormField[] }) => void;
  onCancel: () => void;
};

export const InstantFormBuilder = ({ onComplete, onCancel }: InstantFormBuilderProps) => {
  const [formName, setFormName] = useState("");
  const [thankYouMessage, setThankYouMessage] = useState("Thank you for your interest! We'll be in touch soon.");
  
  // Default fields for Meta instant forms
  const [fields, setFields] = useState<FormField[]>([
    { id: '1', type: 'full_name', label: 'Full Name', required: true, placeholder: 'Enter your full name' },
    { id: '2', type: 'email', label: 'Email Address', required: true, placeholder: 'Enter your email' },
    { id: '3', type: 'phone_number', label: 'Phone Number', required: false, placeholder: 'Enter your phone number' },
  ]);

  const [customQuestion, setCustomQuestion] = useState("");

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'full_name': return <User className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'phone_number': return <Phone className="h-4 w-4" />;
      case 'custom': return <MessageSquare className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const addCustomField = () => {
    if (!customQuestion.trim()) return;
    
    const newField: FormField = {
      id: Date.now().toString(),
      type: 'custom',
      label: customQuestion,
      required: false,
      placeholder: `Enter ${customQuestion.toLowerCase()}`
    };
    
    setFields([...fields, newField]);
    setCustomQuestion("");
  };

  const removeField = (id: string) => {
    // Can't remove required default fields
    const field = fields.find(f => f.id === id);
    if (field && (field.type === 'full_name' || field.type === 'email')) {
      return;
    }
    setFields(fields.filter(f => f.id !== id));
  };

  const toggleRequired = (id: string) => {
    setFields(fields.map(f => {
      if (f.id === id) {
        // Full name and email are always required in Meta forms
        if (f.type === 'full_name' || f.type === 'email') {
          return f;
        }
        return { ...f, required: !f.required };
      }
      return f;
    }));
  };

  const handleComplete = () => {
    if (!formName.trim()) {
      return;
    }
    
    onComplete({
      name: formName,
      fields: fields
    });
  };

  return (
    <div className="border rounded-lg p-6 my-2 bg-card max-w-2xl">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Create New Instant Form</h3>
        <p className="text-sm text-muted-foreground">
          Build a form to collect leads directly on Facebook and Instagram
        </p>
      </div>

      {/* Form Name */}
      <div className="space-y-4 mb-6">
        <div>
          <Label htmlFor="formName" className="text-sm font-medium mb-2 block">
            Form Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="formName"
            placeholder="e.g., Toronto Home Buyers Lead"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Internal name for your reference (not shown to users)
          </p>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Form Fields</Label>
          <span className="text-xs text-muted-foreground">{fields.length} fields</span>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {fields.map((field) => {
            const isDefaultRequired = field.type === 'full_name' || field.type === 'email';
            
            return (
              <div
                key={field.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30"
              >
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  {getFieldIcon(field.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{field.label}</p>
                  <p className="text-xs text-muted-foreground">{field.placeholder}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={field.required}
                      onCheckedChange={() => toggleRequired(field.id)}
                      disabled={isDefaultRequired}
                    />
                    <span className="text-xs text-muted-foreground">
                      {field.required ? 'Required' : 'Optional'}
                    </span>
                  </div>

                  {!isDefaultRequired && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeField(field.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          <CheckCircle2 className="h-3 w-3 inline mr-1 text-blue-600" />
          Full Name and Email are required by Meta
        </p>
      </div>

      {/* Add Custom Field */}
      <div className="space-y-2 mb-6 p-4 rounded-lg bg-muted/50 border border-dashed border-border">
        <Label htmlFor="customQuestion" className="text-sm font-medium">
          Add Custom Question
        </Label>
        <div className="flex gap-2">
          <Input
            id="customQuestion"
            placeholder="e.g., What's your budget?"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomField()}
          />
          <Button
            onClick={addCustomField}
            disabled={!customQuestion.trim()}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {/* Thank You Message */}
      <div className="space-y-2 mb-6">
        <Label htmlFor="thankYou" className="text-sm font-medium">
          Thank You Message
        </Label>
        <Input
          id="thankYou"
          placeholder="Message shown after form submission"
          value={thankYouMessage}
          onChange={(e) => setThankYouMessage(e.target.value)}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={handleComplete}
          disabled={!formName.trim()}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          Create Form
        </Button>
      </div>

      {/* Info */}
      <div className="mt-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
        <p className="text-xs text-muted-foreground">
          💡 This form will be connected to your Meta Business account when you publish the ad
        </p>
      </div>
    </div>
  );
};

