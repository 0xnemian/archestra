"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Brain,
  Copy,
  Edit3,
  File,
  FileText,
  Folder,
  Key,
  Link as LinkIcon,
  Lock,
  Mic,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Wrench,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Static data for the prototype
const staticProfile = {
  id: "1",
  name: "AI Research Assistant",
  description: "A powerful research assistant for academic papers and data analysis",
};

const staticChats = [
  {
    id: "1",
    title: "Analyzing market trends Q4 2024",
    lastMessage: "2 hours ago",
    messageCount: 24,
  },
  {
    id: "2",
    title: "Research paper review: ML algorithms",
    lastMessage: "5 hours ago",
    messageCount: 18,
  },
  {
    id: "3",
    title: "Data visualization strategies",
    lastMessage: "Yesterday",
    messageCount: 42,
  },
  {
    id: "4",
    title: "API integration planning",
    lastMessage: "2 days ago",
    messageCount: 15,
  },
];

const staticFiles = [
  {
    id: "1",
    name: "research-data.csv",
    type: "file",
    icon: File,
    size: "2.4 MB",
  },
  {
    id: "2",
    name: "Project Documents",
    type: "folder",
    icon: Folder,
    itemCount: 12,
  },
  {
    id: "3",
    name: "Q4 Analysis Report",
    type: "gdrive",
    icon: FileText,
    source: "Google Drive",
  },
  {
    id: "4",
    name: "ML Model Documentation",
    type: "file",
    icon: FileText,
    size: "1.2 MB",
  },
];

const staticPrompts = [
  {
    id: "1",
    title: "Research Summary",
    description: "Summarize the key findings from the uploaded documents",
    icon: BookOpen,
  },
  {
    id: "2",
    title: "Data Analysis",
    description: "Analyze trends and patterns in the provided dataset",
    icon: Sparkles,
  },
  {
    id: "3",
    title: "Literature Review",
    description: "Generate a comprehensive literature review on a topic",
    icon: FileText,
  },
];

const staticTools = [
  {
    id: "2",
    name: "code_interpreter",
    server: "Python Runtime",
    description: "Execute Python code for data analysis",
    hasCredential: false,
    enabled: true,
  },
  {
    id: "3",
    name: "file_reader",
    server: "Filesystem",
    description: "Read and parse various file formats",
    hasCredential: false,
    enabled: true,
  },
  {
    id: "4",
    name: "database_query",
    server: "PostgreSQL",
    description: "Query the connected database",
    hasCredential: true,
    credentialName: "db-credentials",
    enabled: false,
  },
];

const availableTools = [
  { id: "5", name: "image_generation", server: "DALL-E", description: "Generate images from text" },
  { id: "6", name: "email_sender", server: "SendGrid", description: "Send emails" },
  { id: "7", name: "calendar", server: "Google Calendar", description: "Manage calendar events" },
];

// Google Drive icon component
function GoogleDriveIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.71 3.5L1.15 15l3.43 5.94h6.01L4.02 9.44 7.71 3.5z"
        fill="#0066DA"
      />
      <path
        d="M16.29 3.5H9.84L16.4 15h6.56l-3.24-5.56L16.29 3.5z"
        fill="#00AC47"
      />
      <path
        d="M1.15 15l3.43 5.94h12.14l3.43-5.94H1.15z"
        fill="#FFBA00"
      />
    </svg>
  );
}

export default function ProfileDetailsPrototype() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedModel, setSelectedModel] = useState("claude-3-opus");
  const [isStarred, setIsStarred] = useState(false);
  const [showToolSearch, setShowToolSearch] = useState(false);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Main Content */}
        <main className="mx-auto max-w-[1600px] p-6">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link
              href="/profiles"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              All Profiles
            </Link>
          </div>

          {/* Profile Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {staticProfile.name}
              </h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Copy Link
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsStarred(!isStarred)}
              >
                <Star
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isStarred
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  )}
                />
              </Button>
            </div>
            {/* Teams */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">Engineering</Badge>
              <Badge variant="secondary" className="text-xs">Data Science</Badge>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
                <Plus className="h-3 w-3 mr-1" />
                Assign teams
              </Button>
            </div>
          </div>

          {/* Two Column Layout with Grid Row Alignment */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:grid-rows-[auto_1fr]">
            {/* Row 1: Start new conversation + Recent Chats | Memory + Instructions */}

            {/* Left Column - Row 1: Chat Section */}
            <div className="flex flex-col gap-4">
              {/* Start new conversation header */}
              <div className="text-sm font-medium text-muted-foreground">
                Start new conversation
              </div>

              {/* Prompt Input - Consistent with existing chat */}
              <InputGroup className="rounded-xl">
                {/* Header - Tools display */}
                <InputGroupAddon align="block-start" className="pt-3">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                      <span>archestra</span>
                      <span className="text-muted-foreground">(24/24)</span>
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </InputGroupAddon>
                <InputGroupTextarea
                  placeholder="Type a message..."
                  className="min-h-[60px] px-4"
                />
                {/* Footer - Model selector, API key, Mic, Submit */}
                <InputGroupAddon align="block-end" className="justify-between">
                  <div className="flex items-center gap-1">
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger className="h-8 w-auto gap-1.5 border-0 bg-transparent text-sm text-muted-foreground hover:text-foreground">
                        <Sparkles className="h-3.5 w-3.5" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="claude-3-opus">Claude Opus 4.1</SelectItem>
                        <SelectItem value="claude-3-sonnet">Claude Sonnet 4</SelectItem>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground gap-1.5">
                      <Key className="h-3.5 w-3.5" />
                      <span>anthr</span>
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    <InputGroupButton size="icon-sm">
                      <Mic className="h-4 w-4" />
                    </InputGroupButton>
                    <InputGroupButton size="icon-sm" variant="default" type="submit">
                      <ArrowUpRight className="h-4 w-4" />
                    </InputGroupButton>
                  </div>
                </InputGroupAddon>
              </InputGroup>

              {/* Recent Chats */}
              <div className="space-y-3 flex-1">
                <h2 className="text-sm font-medium text-muted-foreground">Recent Chats</h2>
                <div className="space-y-1 divide-y divide-border/50">
                  {staticChats.map((chat) => (
                    <div
                      key={chat.id}
                      className="group flex items-center justify-between py-3 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div>
                        <h3 className="font-medium text-sm">
                          {chat.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Last message {chat.lastMessage}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Row 1: Memory + Instructions */}
            <div className="flex flex-col gap-4">
              {/* Memory Section */}
              <div className="rounded-xl border bg-card p-4 flex-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Memory</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1 text-xs font-normal">
                      <Lock className="h-3 w-3" />
                      Only you
                    </Badge>
                    <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  User is working on a research project analyzing market trends and
                  customer behavior patterns across multiple regions. Prefers detailed
                  explanations with data visualizations and charts. Working timezone: EST.
                  Primary focus areas include competitive analysis, quarterly forecasting,
                  and strategic planning initiatives. Frequently references historical data
                  from 2020-2024 for trend comparisons. Prefers concise executive summaries
                  followed by detailed breakdowns. Uses Python for data analysis and prefers
                  matplotlib for visualizations. Key stakeholders include product and marketing teams.
                </p>
                <p className="mt-2 text-xs text-muted-foreground/70">
                  Last updated 2 hours ago
                </p>
              </div>

              {/* Instructions Section */}
              <div className="rounded-xl border bg-card p-4 flex-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Instructions</span>
                  </div>
                  <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-8">
                  # Role
                  You are my personal research assistant specializing in data analysis and market research.
                  Your job is to help me analyze complex datasets, summarize findings, and provide actionable insights.
                  Always cite your sources and provide step-by-step explanations for your conclusions.

                  # Guidelines
                  - Use clear, professional language suitable for executive presentations
                  - Include relevant statistics, metrics, and confidence intervals
                  - Provide recommendations with supporting evidence and risk assessment
                  - Format outputs with headers, bullet points, and tables when appropriate
                  - Flag any data quality issues or limitations in the analysis
                </p>
                <Button variant="link" className="h-auto p-0 text-xs mt-2 text-muted-foreground hover:text-foreground">
                  Show more
                </Button>
              </div>
            </div>

            {/* Row 2: Prompts + Tools | Knowledge */}

            {/* Left Column - Row 2: Prompts + Tools */}
            <div className="flex flex-col gap-4">
              {/* Prompts Section - Card style */}
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Prompts</span>
                  </div>
                  <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {staticPrompts.map((prompt) => (
                    <div
                      key={prompt.id}
                      className="group flex items-center gap-3 rounded-lg bg-muted/50 p-3 hover:bg-muted cursor-pointer transition-colors"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <prompt.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{prompt.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {prompt.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tools Section - Card style */}
              <div className="rounded-xl border bg-card p-4 flex-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Tools</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7"
                    onClick={() => setShowToolSearch(!showToolSearch)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Quick Add Tool Search */}
                {showToolSearch && (
                  <div className="space-y-2 mb-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search tools to add..."
                        className="pl-9 h-9"
                      />
                    </div>
                    <div className="space-y-1 rounded-lg border p-2 max-h-40 overflow-y-auto">
                      {availableTools.map((tool) => (
                        <div
                          key={tool.id}
                          className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50 cursor-pointer"
                        >
                          <div>
                            <p className="text-sm font-medium">{tool.name}</p>
                            <p className="text-xs text-muted-foreground">{tool.server}</p>
                          </div>
                          <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tools List */}
                <div className="space-y-2">
                  {staticTools.map((tool) => (
                    <div
                      key={tool.id}
                      className="group rounded-lg bg-muted/50 p-3 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">{tool.name}</p>
                            <Badge variant="outline" className="text-[10px] h-5 font-normal">
                              {tool.server}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {tool.description}
                          </p>
                        </div>
                        {/* Credential Select */}
                        <Select defaultValue={tool.hasCredential ? "static" : "dynamic"}>
                          <SelectTrigger className="h-7 w-auto text-xs border-0 bg-transparent shadow-none p-0 gap-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="text-xs text-muted-foreground px-2 py-1">Static credentials</div>
                            <SelectItem value="static" className="text-xs">
                              {tool.hasCredential ? tool.credentialName : "Team credentials"}
                            </SelectItem>
                            <Separator className="my-1" />
                            <SelectItem value="dynamic" className="text-xs">
                              <div className="flex items-center gap-1">
                                <Zap className="h-3 w-3 text-amber-500" />
                                Resolve at runtime
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Row 2: Knowledge */}
            <div className="rounded-xl border bg-card p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Knowledge</span>
                </div>
                <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Storage indicator */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-1 w-1 rounded-full bg-primary" />
                  <Progress value={1} className="h-1 flex-1" />
                </div>
                <p className="text-xs text-muted-foreground">1% of project capacity used</p>
              </div>

              {/* Drag & Drop Zone */}
              <div
                className={cn(
                  "relative rounded-lg border border-dashed p-4 text-center transition-all cursor-pointer mb-3",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/30"
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={() => setIsDragging(false)}
              >
                <Upload className="mx-auto h-6 w-6 text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground">
                  Drag & drop files here
                </p>
                <p className="text-xs text-muted-foreground/60">
                  or click to browse
                </p>
              </div>

              {/* Upload Buttons */}
              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs">
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Upload Files
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <GoogleDriveIcon className="mr-1.5 h-3.5 w-3.5" />
                  Google Drive
                </Button>
              </div>

              {/* Files List */}
              <div className="space-y-2 flex-1">
                {staticFiles.map((file) => (
                  <div
                    key={file.id}
                    className="group flex items-center gap-3 rounded-lg bg-muted/50 p-3 hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {file.type === "gdrive" ? (
                          <Badge variant="secondary" className="text-[10px] h-5 gap-1 font-normal">
                            <GoogleDriveIcon className="h-3 w-3" />
                            DOC
                          </Badge>
                        ) : file.type === "folder" ? (
                          <Badge variant="secondary" className="text-[10px] h-5 gap-1 font-normal">
                            <Folder className="h-3 w-3" />
                            {file.itemCount} items
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] h-5 gap-1 font-normal">
                            <File className="h-3 w-3" />
                            {file.name.split('.').pop()?.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
