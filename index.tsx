import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- SUPABASE CLIENT ---
// Assumes Supabase credentials are provided via environment variables.
// The app will not connect to the database if these are not set.
const supabaseUrl = process.env.SUPABASE_URL_SECRET;
const supabaseKey = process.env.SUPABASE_KEY_SECRET;

// --- TYPE DEFINITIONS ---
type Prompt = {
  id: string;
  title: string;
  prompt: string;
  model: string;
  tags: string[];
  isFavorite: boolean;
  lastUsed: string;
};

type BrandMessage = {
  id: string;
  content: string;
  type: 'Tagline' | 'Mission Statement' | 'Value Prop' | 'Boilerplate';
  status: 'Draft' | 'Approved';
};

type CFP = {
  id: string;
  event_name: string;
  cfp_link: string;
  speaker: string;
  status: 'IN CONSIDERATION' | 'SUBMITTED' | 'ACCEPTED' | 'DECLINED';
  submission_deadline: string; // YYYY-MM-DD
};

type Event = {
    id: string;
    name: string;
    start_date: string; // YYYY-MM-DD
    end_date: string; // YYYY-MM-DD
    location: string;
};

type DeveloperPersona = {
  id: string;
  name: string;
  role?: string;
  description?: string;
};

type PainPoint = {
    id: string;
    step_id: string;
    description: string;
    severity?: 'low' | 'medium' | 'high';
};

type MarketingTouchpoint = {
    id: string;
    step_id: string;
    title: string;
    description?: string;
    content_url?: string;
    touchpoint_type: 'Blog Post' | 'Video Tutorial' | 'Email' | 'Social Media Post' | 'Docs' | 'Webinar' | 'Case Study' | 'Other';
};

type JourneyMetric = {
    id: string;
    step_id: string;
    metric_name: string;
    metric_goal?: number;
    measurement_type: 'count' | 'percentage' | 'duration';
};

type JourneyAudit = {
    id: string;
    step_id: string;
    change_description: string;
    changed_by: string;
    created_at: string;
};

type JourneyStep = {
    id: string;
    stage_id: string;
    user_action: string;
    user_goal: string;
    personas: DeveloperPersona[];
    pain_points: PainPoint[];
    touchpoints: MarketingTouchpoint[];
    metrics: JourneyMetric[];
    audits?: JourneyAudit[];
};

type JourneyStage = {
    id: string;
    name: string;
    stage_order: number;
    steps: JourneyStep[];
};

type IconProps = {
  className?: string;
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      developer_personas: {
        Row: DeveloperPersona
        Insert: Partial<DeveloperPersona>
        Update: Partial<DeveloperPersona>
      }
      journey_stages: {
        Row: { id: string; name: string; stage_order: number }
        Insert: { name: string; stage_order: number }
        Update: Partial<{ name: string; stage_order: number }>
      }
      journey_steps: {
        Row: { id: string; stage_id: string; user_action: string; user_goal: string }
        Insert: { stage_id: string; user_action: string; user_goal: string }
        Update: Partial<{ stage_id: string; user_action: string; user_goal: string }>
      }
      pain_points: {
        Row: PainPoint
        Insert: Partial<PainPoint>
        Update: Partial<PainPoint>
      }
      marketing_touchpoints: {
        Row: MarketingTouchpoint
        Insert: Partial<MarketingTouchpoint>
        Update: Partial<MarketingTouchpoint>
      }
      persona_journey_steps: {
        Row: { persona_id: string; step_id: string }
        Insert: { persona_id: string; step_id: string }
        Update: Partial<{ persona_id: string; step_id: string }>
      }
      journey_metrics: {
        Row: JourneyMetric
        Insert: Partial<JourneyMetric>
        Update: Partial<JourneyMetric>
      }
      journey_audits: {
        Row: JourneyAudit
        Insert: Partial<JourneyAudit>
        Update: Partial<JourneyAudit>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
  }
}

const supabase: SupabaseClient<Database> | null = (supabaseUrl && supabaseKey) ? createClient<Database>(supabaseUrl, supabaseKey) : null;

// --- SVG ICONS ---
const MessageSquareIcon = ({ className }: IconProps) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);
const StarIcon = ({ className }: IconProps) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);
const FolderIcon = ({ className }: IconProps) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);
const ImageIcon = ({ className }: IconProps) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
);
const MegaphoneIcon = ({ className }: IconProps) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg>
);
const ClipboardListIcon = ({ className }: IconProps) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M12 11h4"></path><path d="M12 16h4"></path><path d="M8 11h.01"></path><path d="M8 16h.01"></path></svg>
);
const LayoutDashboardIcon = ({ className }: IconProps) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
);
const CalendarIcon = ({ className }: IconProps) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
);
const SearchIcon = ({ className }: IconProps) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const BellIcon = ({ className }: IconProps) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
);
const PlusIcon = ({ className }: IconProps) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
const XIcon = ({ className }: IconProps) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
const EditIcon = ({ className }: IconProps) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
);
const TrashIcon = ({ className }: IconProps) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
);
const CopyIcon = ({ className }: IconProps) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
);
const CheckIcon = ({ className }: IconProps) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);
const MapIcon = ({ className }: IconProps) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
);
const ChevronRightIcon = ({ className }: IconProps) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);
const UserIcon = ({ className }: IconProps) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
);
const AlertTriangleIcon = ({ className }: IconProps) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
);
const ChevronDownIcon = ({ className }: IconProps) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);
const LinkIcon = ({ className }: IconProps) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg>
);
const PresentationIcon = ({ className }: IconProps) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/></svg>
);
const BarChartIcon = ({ className }: IconProps) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>
);
const FileTextIcon = ({ className }: IconProps) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
);
const LoaderIcon = ({ className }: IconProps) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
);


// --- MOCK DATA & CONSTANTS ---
const initialPrompts: Prompt[] = [
  { id: '1', title: 'Q4 Launch Campaign', prompt: 'Generate 10 taglines for our new product "SynthWave" focusing on AI-powered productivity for creative teams...', model: 'gemini-2.5-flash', tags: ['launch', 'taglines', 'productivity'], isFavorite: true, lastUsed: '2 days ago' },
  { id: '2', title: 'Weekly Product Update', prompt: 'Write a short, engaging twitter thread about our latest feature update. The features are: improved dashboard analytics, new integration with Figma...', model: 'gemini-2.5-flash', tags: ['twitter', 'update', 'engagement'], isFavorite: false, lastUsed: '5 days ago' },
];

const initialBrandMessages: BrandMessage[] = [
  { id: 'bm1', content: 'SynthWave: Supercharge your creative workflow with AI.', type: 'Tagline', status: 'Approved' },
  { id: 'bm2', content: 'To empower creative teams to achieve their best work, faster.', type: 'Mission Statement', status: 'Approved' },
];

const getTomorrow = (days=1) => {
    const today = new Date();
    today.setDate(today.getDate() + days);
    return today.toISOString().split('T')[0];
}

const initialCFPs: CFP[] = [
    { id: 'cfp1', event_name: 'AI DevWorld 2024', cfp_link: 'https://aidevworld.com/cfp', speaker: 'Jane Doe', status: 'SUBMITTED', submission_deadline: getTomorrow(20) },
    { id: 'cfp2', event_name: 'Global AI Summit', cfp_link: 'https://globalaisummit.com/speak', speaker: 'John Smith', status: 'IN CONSIDERATION', submission_deadline: getTomorrow(5) },
    { id: 'cfp3', event_name: 'ReactConf 2025', cfp_link: 'https://reactconf.com/submissions', speaker: 'Alex Ray', status: 'ACCEPTED', submission_deadline: getTomorrow(-30) }, // Past
    { id: 'cfp4', event_name: 'Future of Web Conf', cfp_link: 'https://futureweb.com/talks', speaker: 'Sam Cho', status: 'IN CONSIDERATION', submission_deadline: getTomorrow(0) }, // Today
];

const initialEvents: Event[] = [
    { id: 'e1', name: 'Global Marketing Expo', start_date: '2024-10-15', end_date: '2024-10-17', location: 'Las Vegas, NV' },
    { id: 'e2', name: 'SaaS Connect 2024', start_date: '2024-11-05', end_date: '2024-11-06', location: 'San Francisco, CA' },
    { id: 'e3', name: 'Future of AI Conference', start_date: '2025-01-20', end_date: '2025-01-22', location: 'Virtual' },
];

const BRAND_MESSAGE_TYPES: BrandMessage['type'][] = ['Tagline', 'Mission Statement', 'Value Prop', 'Boilerplate'];
const BRAND_MESSAGE_STATUSES: BrandMessage['status'][] = ['Draft', 'Approved'];
const AI_MODELS = ['gemini-2.5-flash', 'imagen-3.0-generate-002'];
const CFP_STATUSES: CFP['status'][] = ['IN CONSIDERATION', 'SUBMITTED', 'ACCEPTED', 'DECLINED'];
const PAIN_POINT_SEVERITIES: PainPoint['severity'][] = ['low', 'medium', 'high'];
const TOUCHPOINT_TYPES: MarketingTouchpoint['touchpoint_type'][] = ['Blog Post', 'Video Tutorial', 'Email', 'Social Media Post', 'Docs', 'Webinar', 'Case Study', 'Other'];
const MEASUREMENT_TYPES: JourneyMetric['measurement_type'][] = ['count', 'percentage', 'duration'];


// --- UI HELPER COMPONENTS ---

type ButtonProps = {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLElement>;
    variant?: 'primary' | 'outline' | 'ghost' | 'destructive';
    className?: string;
    as?: React.ElementType;
    size?: 'default' | 'icon' | 'sm';
    [key: string]: any;
};

const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'primary', className = '', as: Component = 'button', size = 'default', ...props }) => {
    const baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 gap-2";
    const sizeClasses = {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        icon: "h-9 w-9"
    };
    const variants = {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    };
    return <Component onClick={onClick} className={`${baseClasses} ${sizeClasses[size]} ${variants[variant]} ${className}`} {...props}>{children}</Component>
}

// --- MAIN COMPONENTS ---

const NavItem: React.FC<{ href: string; icon: React.ReactNode; children: React.ReactNode; active?: boolean; onClick: () => void; }> = ({ href, icon, children, active, onClick }) => (
  <a href={href} onClick={(e) => { e.preventDefault(); onClick(); }} className={`flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'}`}>
    {icon}
    <span>{children}</span>
  </a>
);

const Sidebar: React.FC<{ activeView: string; setActiveView: (view: string) => void; }> = ({ activeView, setActiveView }) => {
    const isPromptView = ['All Prompts', 'Favorites'].includes(activeView);

    return (
        <aside className="w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
            <div className="p-4 h-16 border-b border-sidebar-border flex items-center">
            <h1 className="text-xl font-bold text-foreground">Marketing Command Center</h1>
            </div>
            <nav className="flex-1 space-y-2 p-2">
                <NavItem href="#" icon={<MessageSquareIcon className="h-5 w-5" />} active={isPromptView} onClick={() => setActiveView('All Prompts')}>
                    All Prompts
                </NavItem>
                <NavItem href="#" icon={<StarIcon className="h-5 w-5" />} active={activeView === 'Favorites'} onClick={() => setActiveView('Favorites')}>
                    Favorites
                </NavItem>
                <NavItem href="#" icon={<ImageIcon className="h-5 w-5" />} active={activeView === 'Visual Assets'} onClick={() => setActiveView('Visual Assets')}>
                    Visual Assets
                </NavItem>
                <NavItem href="#" icon={<MegaphoneIcon className="h-5 w-5" />} active={activeView === 'Brand Messaging'} onClick={() => setActiveView('Brand Messaging')}>
                    Brand Messaging
                </NavItem>
                <NavItem href="#" icon={<CalendarIcon className="h-5 w-5" />} active={activeView === 'Events'} onClick={() => setActiveView('Events')}>
                    Events
                </NavItem>
                 <NavItem href="#" icon={<ClipboardListIcon className="h-5 w-5" />} active={activeView === 'CFP Management'} onClick={() => setActiveView('CFP Management')}>
                    CFP Management
                </NavItem>
                <NavItem href="#" icon={<MapIcon className="h-5 w-5" />} active={activeView === 'Developer Journey'} onClick={() => setActiveView('Developer Journey')}>
                    Developer Journey
                </NavItem>
            </nav>
        </aside>
    );
}

const Header: React.FC<{searchTerm: string; onSearchChange: (term: string) => void; showSearch: boolean}> = ({ searchTerm, onSearchChange, showSearch }) => (
    <header className="flex items-center justify-between border-b border-border px-6 py-3 h-16 flex-shrink-0">
        <div className="w-96">
          {showSearch && (
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                    type="search" 
                    placeholder="Search prompts..." 
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-input border-border placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none" 
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
            <button className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors" aria-label="Notifications">
                <BellIcon className="h-5 w-5" />
            </button>
            <div className="h-9 w-9 overflow-hidden rounded-full bg-muted flex items-center justify-center font-bold text-primary">
              CM
            </div>
        </div>
    </header>
);

const PromptCard: React.FC<{ prompt: Prompt; onCardClick: (prompt: Prompt) => void; onTagClick: (tag: string) => void; }> = ({ prompt, onCardClick, onTagClick }) => (
  <div className="group relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer" onClick={() => onCardClick(prompt)}>
    <div className="p-4 flex flex-col h-full">
      <h3 className="font-semibold text-foreground truncate mb-2">{prompt.title}</h3>
      <p className="text-sm text-muted-foreground text-ellipsis overflow-hidden flex-grow" style={{ maxHeight: '4.5rem' }}>{prompt.prompt}</p>
      <div className="flex flex-wrap gap-2 mt-3">
          {prompt.tags.slice(0, 3).map(tag => (
              <button 
                  key={tag} 
                  onClick={(e) => { e.stopPropagation(); onTagClick(tag); }}
                  className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                  #{tag}
              </button>
          ))}
      </div>
      <div className="text-xs text-muted-foreground flex items-center justify-end pt-3 mt-3 border-t border-border">
          <span>{prompt.lastUsed}</span>
      </div>
    </div>
  </div>
);

const PromptModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void;
    mode: 'view' | 'create' | 'edit';
    promptData: Prompt | null;
    onSave: (prompt: Omit<Prompt, 'id' | 'lastUsed' | 'isFavorite'> & { id?: string; isFavorite?: boolean }) => void;
    onDelete: (id: string) => void;
}> = ({ isOpen, onClose, mode, promptData, onSave, onDelete }) => {
    const [currentMode, setCurrentMode] = useState(mode);
    const [formData, setFormData] = useState<Omit<Prompt, 'id' | 'lastUsed' | 'isFavorite'>>({ title: '', prompt: '', model: AI_MODELS[0], tags: [] });
    const [errors, setErrors] = useState<{ title?: string; prompt?: string }>({});
    const [copyButtonText, setCopyButtonText] = useState('Copy Prompt');

    useEffect(() => {
        setCurrentMode(mode);
        if (isOpen) {
            if ((mode === 'edit' || mode === 'view') && promptData) {
                setFormData({
                    title: promptData.title,
                    prompt: promptData.prompt,
                    model: promptData.model,
                    tags: promptData.tags,
                });
            } else if (mode === 'create') {
                setFormData({ title: '', prompt: '', model: AI_MODELS[0], tags: [] });
            }
        }
    }, [isOpen, mode, promptData]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) }));
    };
    
    const validate = () => {
        const newErrors: { title?: string; prompt?: string } = {};
        if (!formData.title.trim()) newErrors.title = "Prompt Title is required.";
        if (!formData.prompt.trim()) newErrors.prompt = "Prompt Text is required.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (validate()) {
            onSave({ ...formData, id: promptData?.id, isFavorite: promptData?.isFavorite });
            alert("Prompt saved successfully");
            onClose();
        }
    };

    const handleDelete = () => {
        if (promptData && window.confirm("Are you sure you want to delete this prompt?")) {
            onDelete(promptData.id);
            onClose();
        }
    }

    const handleCopyToClipboard = () => {
        if (promptData?.prompt) {
            navigator.clipboard.writeText(promptData.prompt);
            setCopyButtonText('Copied!');
            setTimeout(() => setCopyButtonText('Copy Prompt'), 2000);
        }
    };
    
    if (!isOpen) return null;

    const ViewContent = () => (
        <>
            <div className="p-6 space-y-4">
                <h2 className="text-2xl font-bold text-foreground">{promptData!.title}</h2>
                <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Prompt</h3>
                    <p className="text-base text-foreground bg-muted p-3 rounded-md whitespace-pre-wrap">{promptData!.prompt}</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-1">AI Model</h3>
                        <p className="text-base text-foreground">{promptData!.model}</p>
                    </div>
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                        {promptData!.tags.map(tag => <span key={tag} className="text-sm bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full">#{tag}</span>)}
                    </div>
                </div>
            </div>
            <div className="px-6 py-4 bg-muted/50 flex justify-between items-center">
                <div>
                  <Button onClick={() => setCurrentMode('edit')} variant="outline"><EditIcon className="w-4 h-4 mr-2" /> Edit</Button>
                  <Button onClick={handleDelete} variant="destructive" className="ml-2"><TrashIcon className="w-4 h-4 mr-2" /> Delete</Button>
                </div>
                <Button onClick={handleCopyToClipboard}>
                    {copyButtonText === 'Copied!' ? <CheckIcon className="w-4 h-4 mr-2"/> : <CopyIcon className="w-4 h-4 mr-2"/>}
                    {copyButtonText}
                </Button>
            </div>
        </>
    );

    const FormContent = () => (
        <>
            <div className="p-6 space-y-4">
                 <h2 className="text-2xl font-bold text-foreground">{currentMode === 'create' ? 'Create New Prompt' : 'Edit Prompt'}</h2>
                 <div>
                    <label htmlFor="title" className="block text-sm font-medium text-muted-foreground mb-1">Prompt Title</label>
                    <input type="text" id="title" name="title" value={formData.title} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg bg-input border-border placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                    {errors.title && <p className="text-sm text-destructive mt-1">{errors.title}</p>}
                 </div>
                 <div>
                    <label htmlFor="prompt" className="block text-sm font-medium text-muted-foreground mb-1">Prompt Text</label>
                    <textarea id="prompt" name="prompt" value={formData.prompt} onChange={handleFormChange} rows={6} className="w-full px-3 py-2 rounded-lg bg-input border-border placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                    {errors.prompt && <p className="text-sm text-destructive mt-1">{errors.prompt}</p>}
                 </div>
                 <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label htmlFor="model" className="block text-sm font-medium text-muted-foreground mb-1">AI Model</label>
                        <select id="model" name="model" value={formData.model} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg bg-input border-border focus:ring-2 focus:ring-ring focus:outline-none">
                            {AI_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                 </div>
                 <div>
                    <label htmlFor="tags" className="block text-sm font-medium text-muted-foreground mb-1">Tags (comma-separated)</label>
                    <input type="text" id="tags" name="tags" value={formData.tags.join(', ')} onChange={handleTagsChange} className="w-full px-3 py-2 rounded-lg bg-input border-border placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                 </div>
            </div>
            <div className="px-6 py-4 bg-muted/50 flex justify-end items-center gap-3">
                <Button onClick={onClose} variant="outline">Cancel</Button>
                <Button onClick={handleSave}>Save Prompt</Button>
            </div>
        </>
    );

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onMouseDown={onClose}>
            <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl overflow-hidden animate-slide-up" onMouseDown={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"><XIcon className="w-6 h-6" /></button>
                {currentMode === 'view' && promptData ? <ViewContent /> : <FormContent />}
            </div>
        </div>
    );
};

const VisualAssets = () => {
    const [logos, setLogos] = useState<{id: string, name: string, src: string}[]>([]);
    const [brandColors] = useState([
        { name: 'Primary', hex: 'oklch(0.606 0.25 292.717)' },
        { name: 'Foreground', hex: 'oklch(0.141 0.005 285.823)' },
        { name: 'Background', hex: 'oklch(1 0 0)' },
        { name: 'Secondary', hex: 'oklch(0.967 0.001 286.375)' },
        { name: 'Destructive', hex: 'oklch(0.577 0.245 27.325)' },
        { name: 'Accent', hex: 'oklch(0.967 0.001 286.375)' },
    ]);
    const [copiedHex, setCopiedHex] = useState<string | null>(null);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const newLogo = {
                    id: new Date().toISOString(),
                    name: file.name,
                    src: e.target?.result as string,
                };
                setLogos(prev => [...prev, newLogo]);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDeleteLogo = (id: string) => {
        setLogos(logos.filter(logo => logo.id !== id));
    };

    const handleCopy = (hex: string) => {
        navigator.clipboard.writeText(hex);
        setCopiedHex(hex);
        setTimeout(() => setCopiedHex(null), 2000);
    };

    return (
        <div>
            <h2 className="text-2xl font-bold tracking-tight mb-6 text-foreground">Visual Assets</h2>
            
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-foreground">Logos & Imagery</h3>
                     <Button as="label" variant="outline" className="cursor-pointer">
                        <PlusIcon className="w-4 h-4 mr-2" /> Upload
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </Button>
                </div>
                {logos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {logos.map(logo => (
                            <div key={logo.id} className="group relative border rounded-lg p-2 bg-card shadow-sm">
                                <div className="aspect-video bg-muted/50 rounded-md flex items-center justify-center overflow-hidden">
                                    <img src={logo.src} alt={logo.name} className="max-w-full max-h-full object-contain p-2" />
                                </div>
                                <p className="text-sm font-medium text-center mt-2 truncate text-muted-foreground">{logo.name}</p>
                                <button onClick={() => handleDeleteLogo(logo.id)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 outline-none">
                                    <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-lg bg-muted/20">
                        <p className="text-muted-foreground">No logos uploaded yet.</p>
                        <Button as="label" variant="ghost" className="mt-2 cursor-pointer">
                           Upload your first logo
                           <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </Button>
                    </div>
                )}
            </section>

            <section className="mt-10">
                <h3 className="text-xl font-semibold text-foreground mb-4">Brand Colors</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {brandColors.map(color => (
                        <div key={color.name} className="border rounded-lg bg-card p-3 shadow-sm">
                            <div className="w-full h-20 rounded-md mb-3 border border-border/50" style={{ backgroundColor: color.hex }}></div>
                            <h4 className="font-semibold text-foreground">{color.name}</h4>
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-sm text-muted-foreground font-mono truncate mr-2">{color.hex}</span>
                                <button onClick={() => handleCopy(color.hex)} className="text-muted-foreground hover:text-foreground transition-colors" title="Copy hex code">
                                    {copiedHex === color.hex ? <CheckIcon className="w-4 h-4 text-primary" /> : <CopyIcon className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

const BrandMessageModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (message: Omit<BrandMessage, 'id'> & { id?: string }) => void;
  messageData: BrandMessage | null;
}> = ({ isOpen, onClose, onSave, messageData }) => {
    const isEditing = !!messageData;
    const [formData, setFormData] = useState<Omit<BrandMessage, 'id'>>({
        content: '',
        type: 'Tagline',
        status: 'Draft',
    });

    useEffect(() => {
        if (isOpen) {
            setFormData(messageData ? { ...messageData } : { content: '', type: 'Tagline', status: 'Draft' });
        }
    }, [isOpen, messageData]);

    const handleSave = () => {
        if (!formData.content.trim()) {
            alert("Content cannot be empty.");
            return;
        }
        onSave({ ...formData, id: messageData?.id });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onMouseDown={onClose}>
            <div className="bg-card rounded-lg shadow-xl w-full max-w-xl overflow-hidden animate-slide-up" onMouseDown={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"><XIcon className="w-6 h-6" /></button>
                <div className="p-6 space-y-4">
                    <h2 className="text-2xl font-bold text-foreground">{isEditing ? 'Edit' : 'Add'} Brand Message</h2>
                    <div>
                        <label htmlFor="content" className="block text-sm font-medium text-muted-foreground mb-1">Content</label>
                        <textarea id="content" rows={4} value={formData.content} onChange={e => setFormData(f => ({ ...f, content: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-input border-border placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="type" className="block text-sm font-medium text-muted-foreground mb-1">Type</label>
                            <select id="type" value={formData.type} onChange={e => setFormData(f => ({ ...f, type: e.target.value as BrandMessage['type'] }))} className="w-full px-3 py-2 rounded-lg bg-input border-border focus:ring-2 focus:ring-ring focus:outline-none">
                                {BRAND_MESSAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
                            <select id="status" value={formData.status} onChange={e => setFormData(f => ({ ...f, status: e.target.value as BrandMessage['status'] }))} className="w-full px-3 py-2 rounded-lg bg-input border-border focus:ring-2 focus:ring-ring focus:outline-none">
                                {BRAND_MESSAGE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-muted/50 flex justify-end items-center gap-3">
                    <Button onClick={onClose} variant="outline">Cancel</Button>
                    <Button onClick={handleSave}>Save Message</Button>
                </div>
            </div>
        </div>
    );
};

const BrandMessaging: React.FC<{
    messages: BrandMessage[];
    onAdd: () => void;
    onEdit: (message: BrandMessage) => void;
    onDelete: (id: string) => void;
}> = ({ messages, onAdd, onEdit, onDelete }) => {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopy = (message: BrandMessage) => {
        navigator.clipboard.writeText(message.content);
        setCopiedId(message.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Brand Messaging</h2>
                <Button onClick={onAdd}>
                    <PlusIcon className="h-4 w-4" />
                    New Message
                </Button>
            </div>
            <div className="border rounded-lg overflow-hidden bg-card">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr className="border-b border-border">
                            <th className="text-left font-semibold p-3 w-1/2">Content</th>
                            <th className="text-left font-semibold p-3">Type</th>
                            <th className="text-left font-semibold p-3">Status</th>
                            <th className="text-right font-semibold p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {messages.length > 0 ? messages.map(msg => (
                            <tr key={msg.id}>
                                <td className="p-3 text-muted-foreground align-top">{msg.content}</td>
                                <td className="p-3 align-top">
                                    <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full text-xs font-medium">{msg.type}</span>
                                </td>
                                <td className="p-3 align-top">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${msg.status === 'Approved' ? 'bg-primary/20 text-primary' : 'bg-amber-500/20 text-amber-500'}`}>{msg.status}</span>
                                </td>
                                <td className="p-3 align-top text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleCopy(msg)} title="Copy Content">
                                            {copiedId === msg.id ? <CheckIcon className="w-4 h-4 text-primary" /> : <CopyIcon className="w-4 h-4" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => onEdit(msg)} title="Edit Message">
                                            <EditIcon className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive/80 hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(msg.id)} title="Delete Message">
                                            <TrashIcon className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="text-center p-8 text-muted-foreground">
                                    No brand messages yet.
                                    <Button onClick={onAdd} variant="ghost" className="mt-2">Add your first message</Button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const CFPModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (cfp: Omit<CFP, 'id'> & { id?: string }) => void;
  cfpData: CFP | null;
}> = ({ isOpen, onClose, onSave, cfpData }) => {
    const isEditing = !!cfpData;
    const [formData, setFormData] = useState<Omit<CFP, 'id'>>({
        event_name: '',
        cfp_link: '',
        speaker: '',
        status: 'IN CONSIDERATION',
        submission_deadline: '',
    });

    useEffect(() => {
        if (isOpen) {
            setFormData(cfpData ? { ...cfpData } : { event_name: '', cfp_link: '', speaker: '', status: 'IN CONSIDERATION', submission_deadline: '' });
        }
    }, [isOpen, cfpData]);

    const handleSave = () => {
        if (!formData.event_name.trim() || !formData.speaker.trim()) {
            alert("Event Name and Speaker are required.");
            return;
        }
        onSave({ ...formData, id: cfpData?.id });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onMouseDown={onClose}>
            <div className="bg-card rounded-lg shadow-xl w-full max-w-xl overflow-hidden animate-slide-up" onMouseDown={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"><XIcon className="w-6 h-6" /></button>
                <div className="p-6 space-y-4">
                    <h2 className="text-2xl font-bold text-foreground">{isEditing ? 'Edit' : 'Add'} CFP Submission</h2>
                    <div>
                        <label htmlFor="event_name" className="block text-sm font-medium text-muted-foreground mb-1">Event Name</label>
                        <input id="event_name" type="text" value={formData.event_name} onChange={e => setFormData(f => ({ ...f, event_name: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-input border-border placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                    </div>
                     <div>
                        <label htmlFor="cfp_link" className="block text-sm font-medium text-muted-foreground mb-1">CFP Link</label>
                        <input id="cfp_link" type="text" value={formData.cfp_link} onChange={e => setFormData(f => ({ ...f, cfp_link: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-input border-border placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="speaker" className="block text-sm font-medium text-muted-foreground mb-1">Speaker</label>
                             <input id="speaker" type="text" value={formData.speaker} onChange={e => setFormData(f => ({ ...f, speaker: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-input border-border placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                        </div>
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
                            <select id="status" value={formData.status} onChange={e => setFormData(f => ({ ...f, status: e.target.value as CFP['status'] }))} className="w-full px-3 py-2 rounded-lg bg-input border-border focus:ring-2 focus:ring-ring focus:outline-none">
                                {CFP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="submission_deadline" className="block text-sm font-medium text-muted-foreground mb-1">Submission Deadline</label>
                        <input id="submission_deadline" type="date" value={formData.submission_deadline} onChange={e => setFormData(f => ({ ...f, submission_deadline: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-input border-border placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                    </div>
                </div>
                <div className="px-6 py-4 bg-muted/50 flex justify-end items-center gap-3">
                    <Button onClick={onClose} variant="outline">Cancel</Button>
                    <Button onClick={handleSave}>Save Submission</Button>
                </div>
            </div>
        </div>
    );
};

const CFPManagement: React.FC<{
    cfps: CFP[];
    onAdd: () => void;
    onEdit: (cfp: CFP) => void;
    onDelete: (id: string) => void;
}> = ({ cfps, onAdd, onEdit, onDelete }) => {
    
    const getDeadlineInfo = (deadline: string): { text: string; className: string } => {
        if (!deadline) return { text: 'N/A', className: 'text-muted-foreground' };

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date
        // Create date from YYYY-MM-DD string, explicitly setting UTC timezone to avoid off-by-one day errors
        const parts = deadline.split('-').map(p => parseInt(p, 10));
        const deadlineDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
        
        const diffTime = deadlineDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const formattedDate = deadlineDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

        if (diffDays < 0) {
            return { text: `Overdue`, className: 'text-red-500 font-medium' };
        }
        if (diffDays === 0) {
            return { text: `Due Today!`, className: 'text-orange-500 font-bold' };
        }
        if (diffDays <= 7) {
            return { text: `In ${diffDays} day${diffDays > 1 ? 's' : ''}`, className: 'text-amber-500 font-medium' };
        }
        return { text: formattedDate, className: 'text-muted-foreground' };
    };

    const statusColors: { [key in CFP['status']]: string } = {
        'ACCEPTED': 'bg-green-500/20 text-green-500',
        'SUBMITTED': 'bg-blue-500/20 text-blue-500',
        'DECLINED': 'bg-red-500/20 text-red-500',
        'IN CONSIDERATION': 'bg-purple-500/20 text-purple-500',
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">CFP Management</h2>
                <Button onClick={onAdd}>
                    <PlusIcon className="h-4 w-4" />
                    New Submission
                </Button>
            </div>
            <div className="border rounded-lg overflow-hidden bg-card">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr className="border-b border-border">
                            <th className="text-left font-semibold p-3">Event</th>
                            <th className="text-left font-semibold p-3">Speaker</th>
                            <th className="text-left font-semibold p-3">Status</th>
                            <th className="text-left font-semibold p-3">Deadline</th>
                            <th className="text-right font-semibold p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {cfps.length > 0 ? cfps.map(cfp => {
                            const deadlineInfo = getDeadlineInfo(cfp.submission_deadline);
                            return (
                                <tr key={cfp.id}>
                                    <td className="p-3 align-top font-medium text-foreground">
                                        <a href={cfp.cfp_link || '#'} target="_blank" rel="noopener noreferrer" className="hover:underline">{cfp.event_name}</a>
                                    </td>
                                    <td className="p-3 align-top text-muted-foreground">{cfp.speaker}</td>
                                    <td className="p-3 align-top">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[cfp.status]}`}>{cfp.status}</span>
                                    </td>
                                    <td className={`p-3 align-top ${deadlineInfo.className}`}>
                                        {deadlineInfo.text}
                                    </td>
                                    <td className="p-3 align-top text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => onEdit(cfp)} title="Edit Submission">
                                                <EditIcon className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive/80 hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(cfp.id)} title="Delete Submission">
                                                <TrashIcon className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        }) : (
                            <tr>
                                <td colSpan={5} className="text-center p-8 text-muted-foreground">
                                    No CFP submissions yet.
                                    <Button onClick={onAdd} variant="ghost" className="mt-2">Add your first submission</Button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const EventModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Omit<Event, 'id'> & { id?: string }) => void;
  eventData: Event | null;
}> = ({ isOpen, onClose, onSave, eventData }) => {
    const isEditing = !!eventData;
    const [formData, setFormData] = useState<Omit<Event, 'id'>>({
        name: '', start_date: '', end_date: '', location: ''
    });

    useEffect(() => {
        if (isOpen) {
            setFormData(eventData ? { ...eventData } : { name: '', start_date: '', end_date: '', location: '' });
        }
    }, [isOpen, eventData]);

    const handleSave = () => {
        if (!formData.name.trim() || !formData.start_date.trim()) {
            alert("Event Name and Start Date are required.");
            return;
        }
        onSave({ ...formData, id: eventData?.id });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onMouseDown={onClose}>
            <div className="bg-card rounded-lg shadow-xl w-full max-w-xl overflow-hidden animate-slide-up" onMouseDown={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"><XIcon className="w-6 h-6" /></button>
                <div className="p-6 space-y-4">
                    <h2 className="text-2xl font-bold text-foreground">{isEditing ? 'Edit' : 'Add'} Event</h2>
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-1">Event Name</label>
                        <input id="name" type="text" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-input border-border placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="start_date" className="block text-sm font-medium text-muted-foreground mb-1">Start Date</label>
                            <input id="start_date" type="date" value={formData.start_date} onChange={e => setFormData(f => ({ ...f, start_date: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-input border-border placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                        </div>
                        <div>
                            <label htmlFor="end_date" className="block text-sm font-medium text-muted-foreground mb-1">End Date</label>
                            <input id="end_date" type="date" value={formData.end_date} onChange={e => setFormData(f => ({ ...f, end_date: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-input border-border placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="location" className="block text-sm font-medium text-muted-foreground mb-1">Location</label>
                        <input id="location" type="text" value={formData.location} onChange={e => setFormData(f => ({ ...f, location: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-input border-border placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                    </div>
                </div>
                <div className="px-6 py-4 bg-muted/50 flex justify-end items-center gap-3">
                    <Button onClick={onClose} variant="outline">Cancel</Button>
                    <Button onClick={handleSave}>Save Event</Button>
                </div>
            </div>
        </div>
    );
};

const EventsManagement: React.FC<{
    events: Event[];
    onAdd: () => void;
    onEdit: (event: Event) => void;
    onDelete: (id: string) => void;
}> = ({ events, onAdd, onEdit, onDelete }) => {

    const formatDateRange = (start: string, end: string) => {
        if (!start) return 'N/A';
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' };
        const startDate = new Date(start).toLocaleDateString(undefined, options);
        if (!end || start === end) return startDate;
        const endDate = new Date(end).toLocaleDateString(undefined, options);
        return `${startDate} - ${endDate}`;
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Industry Events</h2>
                <Button onClick={onAdd}>
                    <PlusIcon className="h-4 w-4" />
                    New Event
                </Button>
            </div>
            <div className="border rounded-lg overflow-hidden bg-card">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr className="border-b border-border">
                            <th className="text-left font-semibold p-3 w-2/5">Event Name</th>
                            <th className="text-left font-semibold p-3">Dates</th>
                            <th className="text-left font-semibold p-3">Location</th>
                            <th className="text-right font-semibold p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {events.length > 0 ? events.map(event => (
                            <tr key={event.id}>
                                <td className="p-3 align-top font-medium text-foreground">{event.name}</td>
                                <td className="p-3 align-top text-muted-foreground">{formatDateRange(event.start_date, event.end_date)}</td>
                                <td className="p-3 align-top text-muted-foreground">{event.location}</td>
                                <td className="p-3 align-top text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => onEdit(event)} title="Edit Event">
                                            <EditIcon className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive/80 hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(event.id)} title="Delete Event">
                                            <TrashIcon className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="text-center p-8 text-muted-foreground">
                                    No events tracked yet.
                                    <Button onClick={onAdd} variant="ghost" className="mt-2">Add your first event</Button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const PersonaManagerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  personas: DeveloperPersona[];
  onPersonaUpdate: () => void;
}> = ({ isOpen, onClose, personas, onPersonaUpdate }) => {
    const [editingPersona, setEditingPersona] = useState<DeveloperPersona | {} | null>(null);

    const handleSave = async (formData: Omit<DeveloperPersona, 'id'> & { id?: string }) => {
        if (!supabase) {
            alert('Database connection is not configured.');
            return;
        }
        if (!formData.name?.trim()) {
            alert("Persona name cannot be empty.");
            return;
        }
        
        const { id, ...dataToSave } = formData;
        
        const { error } = await supabase
            .from('developer_personas')
            .upsert(id ? { id, ...dataToSave } : dataToSave);

        if (error) {
            alert('Failed to save persona: ' + error.message);
        } else {
            setEditingPersona(null);
            onPersonaUpdate();
        }
    };
    
    const handleDelete = async (id: string) => {
        if (!supabase) {
            alert('Database connection is not configured.');
            return;
        }
        if (window.confirm("Are you sure you want to delete this persona? This will remove them from all journey steps.")) {
            const { error } = await supabase.from('developer_personas').delete().eq('id', id);
             if (error) {
                alert('Failed to delete persona: ' + error.message);
            } else {
                onPersonaUpdate();
            }
        }
    };
    
    if (!isOpen) return null;

    const PersonaForm: React.FC<{persona: DeveloperPersona | {}, onCancel: () => void}> = ({ persona, onCancel }) => {
        const [formData, setFormData] = useState<Omit<DeveloperPersona, 'id'> & { id?: string }>({ id: 'id' in persona ? persona.id : undefined, name: 'name' in persona ? persona.name : '', role: 'role' in persona ? persona.role || '' : '', description: 'description' in persona ? persona.description || '' : ''});
        return (
            <div className="bg-muted/50 p-4 rounded-lg mt-4 border border-border space-y-3">
                 <h3 className="font-semibold text-foreground">{ 'id' in formData ? 'Edit' : 'Create New'} Persona</h3>
                 <input type="text" placeholder="Persona Name (e.g., Hobbyist Hacker)" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-input border-border placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none text-sm" />
                 <input type="text" placeholder="Role (e.g., Individual Contributor)" value={formData.role} onChange={e => setFormData(f => ({ ...f, role: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-input border-border placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none text-sm" />
                 <textarea placeholder="Description" value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2 rounded-lg bg-input border-border placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none text-sm" />
                 <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
                    <Button size="sm" onClick={() => handleSave(formData)}>Save Persona</Button>
                 </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onMouseDown={onClose}>
            <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-slide-up flex flex-col" onMouseDown={e => e.stopPropagation()}>
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-foreground">Manage Developer Personas</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><XIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-6 flex-1 overflow-y-auto space-y-4">
                    {personas.map(p => (
                        <div key={p.id} className="p-4 border border-border rounded-lg bg-card">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-primary">{p.name}</h3>
                                    <p className="text-sm font-medium text-muted-foreground">{p.role}</p>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingPersona(p)}><EditIcon className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/80 hover:text-destructive" onClick={() => handleDelete(p.id)}><TrashIcon className="w-4 h-4" /></Button>
                                </div>
                            </div>
                            <p className="text-sm text-foreground mt-2">{p.description}</p>
                        </div>
                    ))}

                    {editingPersona && <PersonaForm persona={editingPersona} onCancel={() => setEditingPersona(null)} />}
                </div>
                <div className="px-6 py-4 bg-muted/50 border-t border-border">
                   {!editingPersona && <Button onClick={() => setEditingPersona({})} className="w-full"><PlusIcon className="w-4 h-4"/> Create New Persona</Button>}
                </div>
            </div>
        </div>
    );
};

const TouchpointDashboardModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    stages: JourneyStage[];
}> = ({ isOpen, onClose, stages }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    if (!isOpen) return null;

    const allTouchpoints = stages.flatMap(stage =>
        stage.steps.flatMap(step =>
            step.touchpoints.map(tp => ({
                ...tp,
                stageName: stage.name,
                stepAction: step.user_action,
            }))
        )
    );

    const filteredTouchpoints = allTouchpoints.filter(tp => {
        const searchMatch = !searchTerm ||
            tp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tp.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const typeMatch = !typeFilter || tp.touchpoint_type === typeFilter;
        return searchMatch && typeMatch;
    });

    return (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onMouseDown={onClose}>
            <div className="bg-card rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden animate-slide-up flex flex-col" onMouseDown={e => e.stopPropagation()}>
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-foreground">Marketing Touchpoints Dashboard</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><XIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-4 border-b border-border flex gap-4">
                     <div className="relative flex-grow">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input 
                            type="search" 
                            placeholder="Search touchpoints..." 
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-input border-border placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none text-sm" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                        className="px-3 py-2 text-sm rounded-lg bg-input border-border focus:ring-2 focus:ring-ring focus:outline-none"
                    >
                        <option value="">All Types</option>
                        {TOUCHPOINT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted/95 backdrop-blur-sm">
                            <tr className="border-b border-border">
                                <th className="text-left font-semibold p-3 w-2/5">Touchpoint</th>
                                <th className="text-left font-semibold p-3">Type</th>
                                <th className="text-left font-semibold p-3">Stage</th>
                                <th className="text-left font-semibold p-3">Step</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredTouchpoints.length > 0 ? filteredTouchpoints.map(tp => (
                                <tr key={tp.id}>
                                    <td className="p-3 align-top">
                                        <div className="font-medium text-foreground flex items-center gap-2">
                                            {tp.title}
                                            {tp.content_url && <a href={tp.content_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"><LinkIcon className="w-3.5 h-3.5"/></a>}
                                        </div>
                                        <p className="text-muted-foreground text-xs mt-1">{tp.description}</p>
                                    </td>
                                    <td className="p-3 align-top">
                                         <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap">{tp.touchpoint_type}</span>
                                    </td>
                                    <td className="p-3 align-top text-muted-foreground">{tp.stageName}</td>
                                    <td className="p-3 align-top text-muted-foreground truncate" title={tp.stepAction}>{tp.stepAction}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="text-center p-8 text-muted-foreground">
                                        No matching touchpoints found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const MetricsDashboardModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    stages: JourneyStage[];
}> = ({ isOpen, onClose, stages }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    if (!isOpen) return null;

    const allMetrics = stages.flatMap(stage =>
        stage.steps.flatMap(step =>
            step.metrics.map(m => ({
                ...m,
                stageName: stage.name,
                stepAction: step.user_action,
            }))
        )
    );

    const filteredMetrics = allMetrics.filter(m => {
        const searchMatch = !searchTerm || m.metric_name.toLowerCase().includes(searchTerm.toLowerCase());
        const typeMatch = !typeFilter || m.measurement_type === typeFilter;
        return searchMatch && typeMatch;
    });

    const formatGoal = (metric: JourneyMetric) => {
        if (metric.metric_goal === undefined) return 'N/A';
        if (metric.measurement_type === 'percentage') return `${metric.metric_goal}%`;
        return metric.metric_goal.toLocaleString();
    };

    return (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onMouseDown={onClose}>
            <div className="bg-card rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden animate-slide-up flex flex-col" onMouseDown={e => e.stopPropagation()}>
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-foreground">Developer Journey Metrics Dashboard</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><XIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-4 border-b border-border flex gap-4">
                     <div className="relative flex-grow">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input 
                            type="search" 
                            placeholder="Search metrics..." 
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-input border-border placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none text-sm" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                        className="px-3 py-2 text-sm rounded-lg bg-input border-border focus:ring-2 focus:ring-ring focus:outline-none"
                    >
                        <option value="">All Types</option>
                        {MEASUREMENT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                    </select>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted/95 backdrop-blur-sm">
                            <tr className="border-b border-border">
                                <th className="text-left font-semibold p-3 w-2/5">Metric</th>
                                <th className="text-left font-semibold p-3">Goal</th>
                                <th className="text-left font-semibold p-3">Type</th>
                                <th className="text-left font-semibold p-3">Stage</th>
                                <th className="text-left font-semibold p-3">Step</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredMetrics.length > 0 ? filteredMetrics.map(m => (
                                <tr key={m.id}>
                                    <td className="p-3 align-top font-medium text-foreground">{m.metric_name}</td>
                                    <td className="p-3 align-top text-muted-foreground">{formatGoal(m)}</td>
                                    <td className="p-3 align-top">
                                        <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full text-xs font-medium capitalize">{m.measurement_type}</span>
                                    </td>
                                    <td className="p-3 align-top text-muted-foreground">{m.stageName}</td>
                                    <td className="p-3 align-top text-muted-foreground truncate" title={m.stepAction}>{m.stepAction}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="text-center p-8 text-muted-foreground">
                                        No matching metrics found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const JourneyReportModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    stages: JourneyStage[];
}> = ({ isOpen, onClose, stages }) => {
    const [filter, setFilter] = useState('full_journey');
    const modalContentRef = useRef<HTMLDivElement>(null);
    const severityColors: {[key: string]: string} = {
        low: 'bg-green-500/20 text-green-700 dark:text-green-300',
        medium: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
        high: 'bg-red-500/20 text-red-700 dark:text-red-300',
    };

    const reportData = React.useMemo(() => {
        const relevantStages = filter === 'full_journey'
            ? stages
            : stages.filter(s => s.id === filter);

        if (!relevantStages.length) return null;
        
        const allSteps = relevantStages.flatMap(s => s.steps.map(step => ({ ...step, stageName: s.name })));
        
        const personaSummary = relevantStages.map(stage => {
            const stagePersonas = new Set(stage.steps.flatMap(step => step.personas.map(p => p.id)));
            return { stageName: stage.name, count: stagePersonas.size };
        });

        const painPoints = allSteps.flatMap(step => step.pain_points.map(pp => ({...pp, stepAction: step.user_action, stageName: step.stageName})));
        
        const painPointSummary = {
            total: painPoints.length,
            bySeverity: painPoints.reduce((acc, pp) => {
                const sev = pp.severity || 'none';
                acc[sev] = (acc[sev] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        };
        
        const touchpoints = allSteps.flatMap(step => step.touchpoints.map(tp => ({...tp, stepAction: step.user_action, stageName: step.stageName})));

        const touchpointSummary = {
            total: touchpoints.length,
            byType: touchpoints.reduce((acc, tp) => {
                acc[tp.touchpoint_type] = (acc[tp.touchpoint_type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        };

        return {
            title: filter === 'full_journey' ? 'Full Journey Summary Report' : `Report for ${relevantStages[0].name} Stage`,
            personaSummary,
            painPoints,
            painPointSummary,
            touchpoints,
            touchpointSummary
        };

    }, [stages, filter]);

    const handlePrint = () => {
        window.print();
    };

    const convertToCSV = (data: any[], headers: {key: string, label: string}[]) => {
        const headerRow = headers.map(h => h.label).join(',');
        const bodyRows = data.map(row => {
            return headers.map(h => {
                let val = row[h.key] || '';
                if (typeof val === 'string') {
                    val = `"${val.replace(/"/g, '""')}"`; // Escape double quotes
                }
                return val;
            }).join(',');
        });
        return [headerRow, ...bodyRows].join('\n');
    };

    const downloadCSV = (csvString: string, filename: string) => {
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPainPoints = () => {
        if (!reportData) return;
        const headers = [
            { key: 'description', label: 'Description' },
            { key: 'severity', label: 'Severity' },
            { key: 'stageName', label: 'Stage' },
            { key: 'stepAction', label: 'User Action' }
        ];
        const csv = convertToCSV(reportData.painPoints, headers);
        downloadCSV(csv, 'pain-points-report.csv');
    };
    
    const handleExportTouchpoints = () => {
        if (!reportData) return;
        const headers = [
            { key: 'title', label: 'Title' },
            { key: 'description', label: 'Description' },
            { key: 'touchpoint_type', label: 'Type' },
            { key: 'content_url', label: 'URL' },
            { key: 'stageName', label: 'Stage' },
            { key: 'stepAction', label: 'User Action' }
        ];
        const csv = convertToCSV(reportData.touchpoints, headers);
        downloadCSV(csv, 'touchpoints-report.csv');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in print:hidden" onMouseDown={onClose}>
            <div className="bg-card rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden animate-slide-up flex flex-col" onMouseDown={e => e.stopPropagation()}>
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-foreground">Journey Analytics Report</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><XIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <div className="flex items-center gap-2">
                         <label htmlFor="report-filter" className="text-sm font-medium">Report Scope:</label>
                         <select
                            id="report-filter"
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="px-3 py-1.5 text-sm rounded-lg bg-input border-border focus:ring-2 focus:ring-ring focus:outline-none"
                        >
                            <option value="full_journey">Full Journey Summary</option>
                            {stages.map(s => <option key={s.id} value={s.id}>Stage: {s.name}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handlePrint}><FileTextIcon className="w-4 h-4"/> Print / Save as PDF</Button>
                        <Button variant="outline" onClick={handleExportPainPoints}><FileTextIcon className="w-4 h-4"/> Export Pain Points (CSV)</Button>
                        <Button variant="outline" onClick={handleExportTouchpoints}><FileTextIcon className="w-4 h-4"/> Export Touchpoints (CSV)</Button>
                    </div>
                </div>
                <div ref={modalContentRef} className="flex-1 overflow-y-auto p-6 space-y-8 report-content">
                    {!reportData ? (
                        <p className="text-muted-foreground">No data for this selection.</p>
                    ) : (
                        <>
                            <h3 className="text-xl font-bold text-foreground">{reportData.title}</h3>

                            <section>
                                <h4 className="text-lg font-semibold text-foreground mb-3">Persona Summary</h4>
                                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                    {reportData.personaSummary.map(s => (
                                        <li key={s.stageName}><strong>{s.stageName} Stage:</strong> {s.count} unique persona(s) involved.</li>
                                    ))}
                                </ul>
                            </section>

                            <section>
                                <h4 className="text-lg font-semibold text-foreground mb-3">Pain Points Summary</h4>
                                <p className="text-muted-foreground mb-4">Total identified: {reportData.painPointSummary.total}</p>
                                <div className="border rounded-lg overflow-hidden bg-card">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="text-left font-semibold p-3 w-2/5">Description</th>
                                                <th className="text-left font-semibold p-3">Severity</th>
                                                <th className="text-left font-semibold p-3">Stage & Step</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {reportData.painPoints.map(pp => (
                                                <tr key={pp.id}>
                                                    <td className="p-3 align-top text-foreground">{pp.description}</td>
                                                    <td className="p-3 align-top">
                                                        {pp.severity ? <span className={`capitalize text-xs font-medium px-2 py-0.5 rounded-full ${severityColors[pp.severity]}`}>{pp.severity}</span> : <span className="text-muted-foreground text-xs">N/A</span>}
                                                    </td>
                                                    <td className="p-3 align-top text-muted-foreground">
                                                        <div className="font-medium">{pp.stageName}</div>
                                                        <div className="text-xs">{pp.stepAction}</div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                            
                            <section>
                                <h4 className="text-lg font-semibold text-foreground mb-3">Marketing Touchpoints Summary</h4>
                                <p className="text-muted-foreground mb-4">Total planned: {reportData.touchpointSummary.total}</p>
                                 <div className="border rounded-lg overflow-hidden bg-card">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="text-left font-semibold p-3 w-2/5">Title</th>
                                                <th className="text-left font-semibold p-3">Type</th>
                                                <th className="text-left font-semibold p-3">Stage & Step</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {reportData.touchpoints.map(tp => (
                                                <tr key={tp.id}>
                                                    <td className="p-3 align-top text-foreground font-medium">{tp.title}</td>
                                                    <td className="p-3 align-top"><span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{tp.touchpoint_type}</span></td>
                                                    <td className="p-3 align-top text-muted-foreground">
                                                        <div className="font-medium">{tp.stageName}</div>
                                                        <div className="text-xs">{tp.stepAction}</div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const DeveloperJourney: React.FC<{
    stages: JourneyStage[];
    allPersonas: DeveloperPersona[];
    onDataUpdate: () => void;
    onOpenPersonaManager: () => void;
    onOpenTouchpointDashboard: () => void;
    onOpenMetricsDashboard: () => void;
    onOpenReportModal: () => void;
    isLoading: boolean;
}> = ({ stages, allPersonas, onDataUpdate, onOpenPersonaManager, onOpenTouchpointDashboard, onOpenMetricsDashboard, onOpenReportModal, isLoading }) => {
    const [editing, setEditing] = useState<{ type: 'stage', id: string, field: 'name' } | { type: 'step', id: string, field: 'action' | 'goal' } | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editingPainPoint, setEditingPainPoint] = useState<(Omit<PainPoint, 'id'> & { id?: string}) | null>(null);
    const [personaPopoverAnchor, setPersonaPopoverAnchor] = useState<HTMLElement | null>(null);
    const [activeStepForPersona, setActiveStepForPersona] = useState<JourneyStep | null>(null);
    const [editingTouchpoint, setEditingTouchpoint] = useState<(Omit<MarketingTouchpoint, 'id'> & { id?: string }) | null>(null);
    const [editingMetric, setEditingMetric] = useState<(Omit<JourneyMetric, 'id'> & { id?: string}) | null>(null);
    
    const popoverRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node) && personaPopoverAnchor && !personaPopoverAnchor.contains(event.target as Node)) {
                setPersonaPopoverAnchor(null);
                setActiveStepForPersona(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [personaPopoverAnchor]);


    const handleEditClick = (type: 'stage'|'step', field: 'name'|'action'|'goal', id: string, currentValue: string) => {
        setEditing({ type, id, field } as any);
        setEditValue(currentValue);
    };

    const handleSave = async () => {
        if (!supabase) {
            alert('Database connection is not configured.');
            return;
        }
        if (!editing) return;
        
        let error;
        if (editing.type === 'stage') {
            const result = await supabase.from('journey_stages').update({ [editing.field]: editValue }).eq('id', editing.id);
            error = result.error;
        } else {
            const result = await supabase.from('journey_steps').update({ [editing.field]: editValue }).eq('id', editing.id);
            error = result.error;
        }

        if (error) {
            alert(`Failed to update ${editing.type}: ${error.message}`);
        } else {
            onDataUpdate();
        }
        setEditing(null);
        setEditValue('');
    };
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSave();
          (e.target as HTMLElement).blur();
        }
        if (e.key === 'Escape') {
            setEditing(null);
            setEditValue('');
        }
    };

    const addStage = async () => {
        if (!supabase) {
            alert('Database connection is not configured.');
            return;
        }
        const { error } = await supabase.from('journey_stages').insert({ name: 'New Stage', stage_order: stages.length + 1 });
        if (error) alert(`Failed to add stage: ${error.message}`);
        else onDataUpdate();
    };

    const deleteStage = async (stageId: string) => {
        if (!supabase) {
            alert('Database connection is not configured.');
            return;
        }
        if (window.confirm('Are you sure you want to delete this stage and all its steps?')) {
            const { error } = await supabase.from('journey_stages').delete().eq('id', stageId);
            if (error) alert(`Failed to delete stage: ${error.message}`);
            else onDataUpdate();
        }
    };
    
    const addStep = async (stageId: string) => {
        if (!supabase) {
            alert('Database connection is not configured.');
            return;
        }
        const { error } = await supabase.from('journey_steps').insert({
            stage_id: stageId,
            user_action: 'New User Action',
            user_goal: 'New User Goal',
        });
        if (error) alert(`Failed to add step: ${error.message}`);
        else onDataUpdate();
    };

    const deleteStep = async (stepId: string) => {
        if (!supabase) {
            alert('Database connection is not configured.');
            return;
        }
        if (window.confirm('Are you sure you want to delete this step?')) {
            const { error } = await supabase.from('journey_steps').delete().eq('id', stepId);
            if (error) alert(`Failed to delete step: ${error.message}`);
            else onDataUpdate();
        }
    };

    const renderEditable = (type: 'stage'|'step', field: 'name'|'action'|'goal', id: string, value: string, className: string, isTextarea = false) => {
        if (editing?.type === type && editing?.id === id && editing.field === field) {
            const InputComponent = isTextarea ? 'textarea' : 'input';
            const props = {
                 value: editValue,
                 onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEditValue(e.target.value),
                 onBlur: handleSave,
                 onKeyDown: handleKeyDown,
                 className:"w-full px-2 py-1 rounded-md bg-input border-border focus:ring-2 focus:ring-ring focus:outline-none",
                 autoFocus: true,
                 rows: isTextarea ? 3 : undefined
            };
            return <InputComponent {...props} />;
        }
        return <div onClick={() => handleEditClick(type, field, id, value)} className={`cursor-pointer w-full p-2 -m-2 rounded-md hover:bg-muted ${className}`}>{value || `Empty ${field}`}</div>
    }

    const PainPointEditor = ({ pp, onSave, onCancel }: {pp: (Omit<PainPoint, 'id'> & {id?: string}), onSave: (data: Omit<PainPoint, 'id' | 'step_id'> & {id?: string, step_id: string}) => void, onCancel: () => void}) => {
        const [formData, setFormData] = useState(pp);
        
        const handleSave = () => {
            if(!formData.description.trim()) {
                alert("Pain point description is required.");
                return;
            }
            onSave(formData as (Omit<PainPoint, 'id'> & {id?: string, step_id: string}));
        }

        return (
            <div className="bg-muted p-3 rounded-md space-y-2 my-2 border border-border">
                <textarea
                    placeholder="Describe the pain point..."
                    className="w-full px-2 py-1 text-sm rounded-md bg-input border-border focus:ring-2 focus:ring-ring focus:outline-none"
                    value={formData.description}
                    onChange={e => setFormData(f => ({...f, description: e.target.value}))}
                    rows={3}
                />
                <div className="flex justify-between items-center">
                    <select
                        value={formData.severity || ''}
                        onChange={e => setFormData(f => ({...f, severity: e.target.value as PainPoint['severity']}))}
                        className="text-xs px-2 py-1 rounded-md bg-input border-border focus:ring-2 focus:ring-ring focus:outline-none"
                    >
                        <option value="">No Severity</option>
                        {PAIN_POINT_SEVERITIES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
                        <Button size="sm" onClick={handleSave}>Save</Button>
                    </div>
                </div>
            </div>
        )
    };

    const handleSavePainPoint = async (painPointData: Omit<PainPoint, 'id'> & { id?: string }) => {
        if (!supabase) {
            alert('Database connection is not configured.');
            return;
        }
        const { error } = await supabase.from('pain_points').upsert(painPointData);
        if (error) alert(`Failed to save pain point: ${error.message}`);
        else {
            onDataUpdate();
            setEditingPainPoint(null);
        }
    };

    const handleDeletePainPoint = async (painPointId: string) => {
        if (!supabase) {
            alert('Database connection is not configured.');
            return;
        }
        const { error } = await supabase.from('pain_points').delete().eq('id', painPointId);
        if (error) alert(`Failed to delete pain point: ${error.message}`);
        else onDataUpdate();
    };
    
    const TouchpointEditor = ({ tp, onSave, onCancel }: {tp: (Omit<MarketingTouchpoint, 'id'> & {id?: string}), onSave: (data: Omit<MarketingTouchpoint, 'id'> & {id?: string}) => void, onCancel: () => void}) => {
        const [formData, setFormData] = useState(tp);
        
        const handleSave = () => {
            if(!formData.title.trim()) {
                alert("Touchpoint title is required.");
                return;
            }
            onSave(formData);
        }

        return (
            <div className="bg-muted p-3 rounded-md space-y-2 my-2 border border-border">
                <input type="text" placeholder="Title" value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} className="w-full px-2 py-1 text-sm rounded-md bg-input border-border focus:ring-2 focus:ring-ring focus:outline-none" />
                <textarea
                    placeholder="Description (optional)"
                    className="w-full px-2 py-1 text-sm rounded-md bg-input border-border focus:ring-2 focus:ring-ring focus:outline-none"
                    value={formData.description || ''}
                    onChange={e => setFormData(f => ({...f, description: e.target.value}))}
                    rows={2}
                />
                 <input type="url" placeholder="URL (optional)" value={formData.content_url || ''} onChange={e => setFormData(f => ({ ...f, content_url: e.target.value }))} className="w-full px-2 py-1 text-sm rounded-md bg-input border-border focus:ring-2 focus:ring-ring focus:outline-none" />
                <div className="flex justify-between items-center">
                    <select
                        value={formData.touchpoint_type}
                        onChange={e => setFormData(f => ({...f, touchpoint_type: e.target.value as MarketingTouchpoint['touchpoint_type']}))}
                        className="text-xs px-2 py-1 rounded-md bg-input border-border focus:ring-2 focus:ring-ring focus:outline-none"
                    >
                        {TOUCHPOINT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
                        <Button size="sm" onClick={handleSave}>Save</Button>
                    </div>
                </div>
            </div>
        )
    };
    
    const handleSaveTouchpoint = async (touchpointData: Omit<MarketingTouchpoint, 'id'> & { id?: string }) => {
        if (!supabase) {
            alert('Database connection is not configured.');
            return;
        }
        const { error } = await supabase.from('marketing_touchpoints').upsert(touchpointData);
        if (error) alert(`Failed to save touchpoint: ${error.message}`);
        else {
            onDataUpdate();
            setEditingTouchpoint(null);
        }
    };

    const handleDeleteTouchpoint = async (touchpointId: string) => {
        if (!supabase) {
            alert('Database connection is not configured.');
            return;
        }
        const { error } = await supabase.from('marketing_touchpoints').delete().eq('id', touchpointId);
        if (error) alert(`Failed to delete touchpoint: ${error.message}`);
        else onDataUpdate();
    };

    const togglePersonaForStep = async (stepId: string, persona: DeveloperPersona) => {
        if (!supabase) {
            alert('Database connection is not configured.');
            return;
        }
        const isSelected = activeStepForPersona?.personas.some(p => p.id === persona.id);
        
        if (isSelected) {
            const { error } = await supabase.from('persona_journey_steps').delete().match({ persona_id: persona.id, step_id: stepId });
             if (error) alert(`Failed to remove persona: ${error.message}`);
             else onDataUpdate();
        } else {
            const { error } = await supabase.from('persona_journey_steps').insert({ persona_id: persona.id, step_id: stepId });
            if (error) alert(`Failed to add persona: ${error.message}`);
            else onDataUpdate();
        }
    };

    const severityColors: {[key: string]: string} = {
        low: 'bg-green-500/20 text-green-700 dark:text-green-300',
        medium: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
        high: 'bg-red-500/20 text-red-700 dark:text-red-300',
    };

    const MetricEditor = ({ metric, onSave, onCancel }: {metric: (Omit<JourneyMetric, 'id'> & {id?: string}), onSave: (data: Omit<JourneyMetric, 'id'> & {id?: string}) => void, onCancel: () => void}) => {
        const [formData, setFormData] = useState(metric);
        
        const handleSave = () => {
            if(!formData.metric_name.trim()) {
                alert("Metric name is required.");
                return;
            }
            onSave(formData);
        }

        return (
            <div className="bg-muted p-3 rounded-md space-y-2 my-2 border border-border">
                <input type="text" placeholder="Metric Name" value={formData.metric_name} onChange={e => setFormData(f => ({ ...f, metric_name: e.target.value }))} className="w-full px-2 py-1 text-sm rounded-md bg-input border-border focus:ring-2 focus:ring-ring focus:outline-none" />
                <input type="number" placeholder="Goal (optional)" value={formData.metric_goal ?? ''} onChange={e => setFormData(f => ({ ...f, metric_goal: e.target.value ? parseFloat(e.target.value) : undefined }))} className="w-full px-2 py-1 text-sm rounded-md bg-input border-border focus:ring-2 focus:ring-ring focus:outline-none" />
                <div className="flex justify-between items-center">
                    <select
                        value={formData.measurement_type}
                        onChange={e => setFormData(f => ({...f, measurement_type: e.target.value as JourneyMetric['measurement_type']}))}
                        className="text-xs px-2 py-1 rounded-md bg-input border-border focus:ring-2 focus:ring-ring focus:outline-none"
                    >
                        {MEASUREMENT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                    </select>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
                        <Button size="sm" onClick={handleSave}>Save</Button>
                    </div>
                </div>
            </div>
        )
    };
    
    const handleSaveMetric = async (metricData: Omit<JourneyMetric, 'id'> & { id?: string }) => {
        if (!supabase) {
            alert('Database connection is not configured.');
            return;
        }
        const { error } = await supabase.from('journey_metrics').upsert(metricData);
        if (error) alert(`Failed to save metric: ${error.message}`);
        else {
            onDataUpdate();
            setEditingMetric(null);
        }
    };

    const handleDeleteMetric = async (metricId: string) => {
        if (!supabase) {
            alert('Database connection is not configured.');
            return;
        }
        const { error } = await supabase.from('journey_metrics').delete().eq('id', metricId);
        if (error) alert(`Failed to delete metric: ${error.message}`);
        else onDataUpdate();
    };
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <LoaderIcon className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Developer Journey</h2>
                <div className="flex gap-2 flex-wrap justify-end">
                    <Button variant="outline" onClick={onOpenReportModal}><FileTextIcon className="w-4 h-4"/> Generate Report</Button>
                    <Button variant="outline" onClick={onOpenMetricsDashboard}><BarChartIcon className="w-4 h-4"/> Metrics Dashboard</Button>
                    <Button variant="outline" onClick={onOpenTouchpointDashboard}><PresentationIcon className="w-4 h-4"/> Touchpoints</Button>
                    <Button variant="outline" onClick={onOpenPersonaManager}><UserIcon className="w-4 h-4"/> Personas</Button>
                    <Button onClick={addStage}><PlusIcon className="w-4 h-4"/> Add Stage</Button>
                </div>
            </div>
            <div className="flex items-start gap-4 pb-4 overflow-x-auto">
                {stages.sort((a,b) => a.stage_order - b.stage_order).map((stage, index) => (
                    <React.Fragment key={stage.id}>
                        <div className="group/stage relative flex-shrink-0 w-96 bg-card border border-border rounded-lg shadow-sm p-4 space-y-4">
                           <div className="flex justify-between items-center">
                                {renderEditable('stage', 'name', stage.id, stage.name, "text-lg font-bold text-foreground")}
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover/stage:opacity-100 text-destructive/80 hover:text-destructive hover:bg-destructive/10" onClick={() => deleteStage(stage.id)}><TrashIcon className="w-4 h-4" /></Button>
                           </div>

                            {stage.steps.map(step => (
                                <div key={step.id} className="group/step relative bg-muted/50 p-3 rounded-md space-y-3 border border-transparent hover:border-border transition-colors">
                                     <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover/step:opacity-100 text-destructive/80 hover:text-destructive hover:bg-destructive/10" onClick={() => deleteStep(step.id)}><TrashIcon className="w-3.5 h-3.5" /></Button>
                                    <div>
                                        <label className="text-xs font-semibold text-muted-foreground uppercase">User Action</label>
                                        {renderEditable('step', 'action', step.id, step.user_action, "text-sm text-foreground", true)}
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-muted-foreground uppercase">User Goal</label>
                                         {renderEditable('step', 'goal', step.id, step.user_goal, "text-sm text-muted-foreground", true)}
                                    </div>
                                    
                                    <div className="pt-2 border-t border-border/50 space-y-2">
                                        <details className="group/details">
                                            <summary className="text-xs font-semibold text-muted-foreground uppercase list-none flex items-center cursor-pointer">
                                                <span>Personas & Pain Points</span>
                                                <ChevronDownIcon className="w-4 h-4 ml-1 transition-transform group-open/details:rotate-180" />
                                            </summary>
                                            <div className="mt-2 space-y-3">
                                                <div>
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase">Personas</label>
                                                    <div className="flex flex-wrap gap-2 items-center mt-1">
                                                        {step.personas.map(p => (
                                                            <span key={p.id} className="flex items-center gap-1 text-xs bg-primary/20 text-primary font-medium px-2 py-0.5 rounded-full">{p.name}
                                                               <button onClick={() => togglePersonaForStep(step.id, p)} className="rounded-full hover:bg-black/20"><XIcon className="w-3 h-3"/></button>
                                                            </span>
                                                        ))}
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {setPersonaPopoverAnchor(e.currentTarget); setActiveStepForPersona(step);}}><PlusIcon className="w-3.5 h-3.5"/></Button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase">Pain Points</label>
                                                    <div className="space-y-2 mt-1">
                                                        {step.pain_points.map(pp => (
                                                            <div key={pp.id} className="group/pp bg-card p-2 rounded-md text-sm relative">
                                                                <p className="text-foreground pr-10">{pp.description}</p>
                                                                {pp.severity && <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block capitalize ${severityColors[pp.severity]}`}>{pp.severity}</span>}
                                                                <div className="absolute top-1 right-1 flex opacity-0 group-hover/pp:opacity-100">
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingPainPoint(pp)}><EditIcon className="w-3 h-3"/></Button>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/80" onClick={() => handleDeletePainPoint(pp.id)}><TrashIcon className="w-3 h-3"/></Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {editingPainPoint?.step_id === step.id && <PainPointEditor pp={editingPainPoint} onSave={handleSavePainPoint} onCancel={() => setEditingPainPoint(null)} />}
                                                        {(!editingPainPoint || editingPainPoint.step_id !== step.id) && (
                                                            <Button variant="outline" size="sm" className="w-full h-8 mt-2" onClick={() => setEditingPainPoint({ step_id: step.id, description: '', severity: undefined})}><PlusIcon className="w-4 h-4"/> Add Pain Point</Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </details>
                                    </div>
                                    
                                    <div className="pt-2 border-t border-border/50">
                                       <details className="group/details">
                                            <summary className="text-xs font-semibold text-muted-foreground uppercase list-none flex items-center cursor-pointer">
                                                <span>Marketing Touchpoints</span>
                                                <ChevronDownIcon className="w-4 h-4 ml-1 transition-transform group-open/details:rotate-180" />
                                            </summary>
                                            <div className="space-y-2 mt-1">
                                                {step.touchpoints.map(tp => (
                                                    <div key={tp.id} className="group/tp bg-card p-2 rounded-md text-sm relative">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-semibold text-foreground flex items-center gap-1.5">{tp.title}
                                                                {tp.content_url && <a href={tp.content_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"><LinkIcon className="w-3.5 h-3.5"/></a>}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground mt-0.5">{tp.description}</p>
                                                            </div>
                                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block capitalize bg-secondary text-secondary-foreground whitespace-nowrap`}>{tp.touchpoint_type}</span>
                                                        </div>
                                                        <div className="absolute top-1 right-1 flex opacity-0 group-hover/tp:opacity-100">
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingTouchpoint(tp)}><EditIcon className="w-3 h-3"/></Button>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/80" onClick={() => handleDeleteTouchpoint(tp.id)}><TrashIcon className="w-3 h-3"/></Button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {editingTouchpoint?.step_id === step.id && <TouchpointEditor tp={editingTouchpoint} onSave={handleSaveTouchpoint} onCancel={() => setEditingTouchpoint(null)} />}
                                                {(!editingTouchpoint || editingTouchpoint.step_id !== step.id) && (
                                                    <Button variant="outline" size="sm" className="w-full h-8 mt-2" onClick={() => setEditingTouchpoint({ step_id: step.id, title: '', touchpoint_type: 'Blog Post' })}><PlusIcon className="w-4 h-4"/> Add Touchpoint</Button>
                                                )}
                                            </div>
                                        </details>
                                    </div>
                                    
                                    <div className="pt-2 border-t border-border/50">
                                       <details className="group/details">
                                            <summary className="text-xs font-semibold text-muted-foreground uppercase list-none flex items-center cursor-pointer">
                                                <span>Metrics</span>
                                                <ChevronDownIcon className="w-4 h-4 ml-1 transition-transform group-open/details:rotate-180" />
                                            </summary>
                                            <div className="space-y-2 mt-1">
                                                {step.metrics.map(metric => (
                                                    <div key={metric.id} className="group/metric bg-card p-2 rounded-md text-sm relative">
                                                        <div className="flex justify-between items-start">
                                                            <p className="font-semibold text-foreground">{metric.metric_name}</p>
                                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize bg-secondary text-secondary-foreground whitespace-nowrap`}>{metric.measurement_type}</span>
                                                        </div>
                                                         {metric.metric_goal !== undefined && <p className="text-xs text-muted-foreground mt-0.5">Goal: {metric.metric_goal.toLocaleString()}{metric.measurement_type === 'percentage' ? '%' : ''}</p>}
                                                        <div className="absolute top-1 right-1 flex opacity-0 group-hover/metric:opacity-100">
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingMetric(metric)}><EditIcon className="w-3 h-3"/></Button>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/80" onClick={() => handleDeleteMetric(metric.id)}><TrashIcon className="w-3 h-3"/></Button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {editingMetric?.step_id === step.id && <MetricEditor metric={editingMetric} onSave={handleSaveMetric} onCancel={() => setEditingMetric(null)} />}
                                                {(!editingMetric || editingMetric.step_id !== step.id) && (
                                                    <Button variant="outline" size="sm" className="w-full h-8 mt-2" onClick={() => setEditingMetric({ step_id: step.id, metric_name: '', measurement_type: 'count' })}><PlusIcon className="w-4 h-4"/> Add Metric</Button>
                                                )}
                                            </div>
                                        </details>
                                    </div>
                                </div>
                            ))}

                            <Button variant="outline" size="default" className="w-full h-9" onClick={() => addStep(stage.id)}><PlusIcon className="w-4 h-4"/> Add Step</Button>
                        </div>
                        {index < stages.length - 1 && <div className="flex-shrink-0 self-center text-muted-foreground"><ChevronRightIcon className="w-10 h-10" /></div>}
                    </React.Fragment>
                ))}
            </div>
            {personaPopoverAnchor && activeStepForPersona && (
                <div 
                    ref={popoverRef} 
                    className="absolute z-10 w-64 bg-popover text-popover-foreground rounded-md shadow-lg border border-border p-2"
                    style={{ top: personaPopoverAnchor.getBoundingClientRect().bottom + 8, left: personaPopoverAnchor.getBoundingClientRect().left }}
                >
                    <h4 className="font-semibold text-sm px-2 py-1">Select Personas</h4>
                    <div className="mt-1 max-h-48 overflow-y-auto">
                        {allPersonas.map(p => {
                            const isSelected = activeStepForPersona.personas.some(sp => sp.id === p.id);
                            return (
                                <label key={p.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer">
                                    <input type="checkbox" checked={isSelected} onChange={() => togglePersonaForStep(activeStepForPersona.id, p)} className="form-checkbox h-4 w-4 rounded text-primary focus:ring-primary" />
                                    <span className="text-sm font-medium">{p.name}</span>
                                </label>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};


const MainContent: React.FC<{ 
    activeView: string;
    isLoading: boolean;
    // Prompts
    prompts: Prompt[];
    onOpenCreateModal: () => void;
    onOpenViewModal: (prompt: Prompt) => void;
    // Brand Messages
    brandMessages: BrandMessage[];
    onAddBrandMessage: () => void;
    onEditBrandMessage: (message: BrandMessage) => void;
    onDeleteBrandMessage: (id: string) => void;
    // CFPs
    cfps: CFP[];
    onAddCFP: () => void;
    onEditCFP: (cfp: CFP) => void;
    onDeleteCFP: (id: string) => void;
    // Events
    events: Event[];
    onAddEvent: () => void;
    onEditEvent: (event: Event) => void;
    onDeleteEvent: (id: string) => void;
    // Journey
    journeyStages: JourneyStage[];
    developerPersonas: DeveloperPersona[];
    onJourneyDataUpdate: () => void;
    onOpenPersonaManager: () => void;
    onOpenTouchpointDashboard: () => void;
    onOpenMetricsDashboard: () => void;
    onOpenReportModal: () => void;
}> = ({ 
    activeView, 
    isLoading,
    prompts, onOpenCreateModal, onOpenViewModal,
    brandMessages, onAddBrandMessage, onEditBrandMessage, onDeleteBrandMessage,
    cfps, onAddCFP, onEditCFP, onDeleteCFP,
    events, onAddEvent, onEditEvent, onDeleteEvent,
    journeyStages, developerPersonas, onJourneyDataUpdate, onOpenPersonaManager, onOpenTouchpointDashboard, onOpenMetricsDashboard, onOpenReportModal
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTag, setActiveTag] = useState<string | null>(null);

    const isPromptView = ['All Prompts', 'Favorites'].includes(activeView);

    const filteredPrompts = prompts.filter(p => {
        if (!isPromptView) return false;

        const viewFilter =
            activeView === 'All Prompts' ? true :
            activeView === 'Favorites' ? p.isFavorite :
            false;

        const searchFilter =
            searchTerm === '' ||
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.prompt.toLowerCase().includes(searchTerm.toLowerCase());
        
        const tagFilter = !activeTag || p.tags.includes(activeTag);

        return viewFilter && searchFilter && tagFilter;
    });

    const handleTagClick = (tag: string) => {
        setActiveTag(tag === activeTag ? null : tag);
    }
    
    const getHeading = () => {
        if (activeTag && isPromptView) return `Tag: #${activeTag}`;
        if (isPromptView) return activeView;
        return "Dashboard";
    }

    const renderContent = () => {
        if (isPromptView) {
            return (
                <>
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button onClick={onOpenCreateModal}>
                                <PlusIcon className="h-4 w-4" />
                                New Prompt
                            </Button>
                        </div>
                        {activeTag && (
                            <div className="flex items-center gap-2 bg-accent text-accent-foreground text-sm px-3 py-1.5 rounded-full">
                                <span>Filtering tag: <strong>#{activeTag}</strong></span>
                                <button onClick={() => setActiveTag(null)} className="ml-2 p-0.5 rounded-full hover:bg-black/20"><XIcon className="h-4 w-4"/></button>
                            </div>
                        )}
                    </div>
                    
                    <h2 className="text-2xl font-bold tracking-tight mb-4 text-foreground">{getHeading()}</h2>

                    {filteredPrompts.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {filteredPrompts.map(p => <PromptCard key={p.id} prompt={p} onCardClick={onOpenViewModal} onTagClick={handleTagClick}/>)}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-border rounded-lg">
                            <p className="text-muted-foreground text-center">
                                {prompts.length === 0 && activeView === 'All Prompts' ? "You don't have any prompts yet." : "No prompts found for this filter."}
                                <br/>
                                {prompts.length === 0 && activeView === 'All Prompts' && <Button onClick={onOpenCreateModal} className="mt-4">Create your first prompt</Button>}
                            </p>
                        </div>
                    )}
                </>
            );
        }
        switch(activeView) {
            case 'Visual Assets':
                return <VisualAssets />;
            case 'Brand Messaging':
                return <BrandMessaging 
                    messages={brandMessages}
                    onAdd={onAddBrandMessage}
                    onEdit={onEditBrandMessage}
                    onDelete={onDeleteBrandMessage}
                />;
            case 'Events':
                return <EventsManagement
                    events={events}
                    onAdd={onAddEvent}
                    onEdit={onEditEvent}
                    onDelete={onDeleteEvent}
                />;
            case 'CFP Management':
                return <CFPManagement
                    cfps={cfps}
                    onAdd={onAddCFP}
                    onEdit={onEditCFP}
                    onDelete={onDeleteCFP}
                />;
            case 'Developer Journey':
                return <DeveloperJourney 
                    stages={journeyStages}
                    allPersonas={developerPersonas}
                    onDataUpdate={onJourneyDataUpdate}
                    onOpenPersonaManager={onOpenPersonaManager}
                    onOpenTouchpointDashboard={onOpenTouchpointDashboard}
                    onOpenMetricsDashboard={onOpenMetricsDashboard}
                    onOpenReportModal={onOpenReportModal}
                    isLoading={isLoading}
                />;
            default:
                return null;
        }
    }

    return (
        <main className="flex-1 flex flex-col bg-background">
            <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} showSearch={isPromptView} />
            <div className="flex-1 p-6 overflow-y-auto">
                {renderContent()}
            </div>
        </main>
    );
}

const App = () => {
    // State
    const [isLoading, setIsLoading] = useState(true);
    const [prompts, setPrompts] = useState<Prompt[]>(initialPrompts);
    const [brandMessages, setBrandMessages] = useState<BrandMessage[]>(initialBrandMessages);
    const [cfps, setCFPs] = useState<CFP[]>(initialCFPs);
    const [events, setEvents] = useState<Event[]>(initialEvents);
    const [journeyStages, setJourneyStages] = useState<JourneyStage[]>([]);
    const [developerPersonas, setDeveloperPersonas] = useState<DeveloperPersona[]>([]);
    const [activeView, setActiveView] = useState('Developer Journey');
    
    // Modal State
    const [isPromptModalOpen, setPromptModalOpen] = useState(false);
    const [promptModalMode, setPromptModalMode] = useState<'view' | 'create' | 'edit'>('create');
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);

    const [isBrandMessageModalOpen, setBrandMessageModalOpen] = useState(false);
    const [selectedBrandMessage, setSelectedBrandMessage] = useState<BrandMessage | null>(null);

    const [isCFPModalOpen, setCFPModalOpen] = useState(false);
    const [selectedCFP, setSelectedCFP] = useState<CFP | null>(null);

    const [isEventModalOpen, setEventModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    const [isPersonaModalOpen, setPersonaModalOpen] = useState(false);
    const [isTouchpointDashboardOpen, setTouchpointDashboardOpen] = useState(false);
    const [isMetricsDashboardOpen, setMetricsDashboardOpen] = useState(false);
    const [isReportModalOpen, setReportModalOpen] = useState(false);

    // Data Fetching
    const fetchJourneyData = useCallback(async () => {
        setIsLoading(true);

        if (!supabase) {
            console.error("Supabase client not initialized because credentials are not provided.");
            setJourneyStages([]);
            setDeveloperPersonas([]);
            setIsLoading(false);
            return;
        }

        const fetchAllPersonas = supabase.from('developer_personas').select('*').order('name');
        
        const fetchStages = supabase
          .from('journey_stages')
          .select(`
            *,
            steps:journey_steps(
              *,
              pain_points(*),
              touchpoints:marketing_touchpoints(*),
              metrics:journey_metrics(*),
              audits:journey_audits(*),
              persona_journey_steps(
                developer_personas(*)
              )
            )
          `)
          .order('stage_order');

        const [{ data: personasData, error: personasError }, { data: stagesData, error: stagesError }] = await Promise.all([fetchAllPersonas, fetchStages]);
        
        if (personasError) console.error('Error fetching personas:', personasError.message);
        if (stagesError) console.error('Error fetching journey stages:', stagesError.message);

        if (personasData) {
            setDeveloperPersonas(personasData);
        }

        if (stagesData) {
            const processedStages = stagesData.map((stage: any) => ({
                ...stage,
                steps: stage.steps.map((step: any) => ({
                    ...step,
                    personas: step.persona_journey_steps.map((pjs: any) => pjs.developer_personas).filter(Boolean),
                    pain_points: step.pain_points || [],
                    touchpoints: step.touchpoints || [],
                    metrics: step.metrics || [],
                    audits: step.audits || [],
                }))
            }));
            setJourneyStages(processedStages);
        }

        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchJourneyData();
    }, [fetchJourneyData]);


    // Prompt Handlers
    const handleOpenCreatePromptModal = () => {
        setSelectedPrompt(null);
        setPromptModalMode('create');
        setPromptModalOpen(true);
    };
    const handleOpenViewPromptModal = (prompt: Prompt) => {
        setSelectedPrompt(prompt);
        setPromptModalMode('view');
        setPromptModalOpen(true);
    };
    const handleClosePromptModal = () => {
        setPromptModalOpen(false);
        setSelectedPrompt(null);
    };
    const handleSavePrompt = (savedPrompt: Omit<Prompt, 'id' | 'lastUsed' | 'isFavorite'> & { id?: string; isFavorite?: boolean }) => {
        const { id, ...promptData } = savedPrompt;
        if (id) { // Editing existing prompt
            setPrompts(prompts.map(p => p.id === id ? { ...p, ...promptData } as Prompt : p));
        } else { // Creating new prompt
            const newPrompt: Prompt = {
                ...(promptData as Omit<Prompt, 'id' | 'lastUsed' | 'isFavorite'>),
                id: new Date().toISOString(),
                lastUsed: 'Just now',
                isFavorite: false,
            };
            setPrompts(prev => [newPrompt, ...prev]);
        }
    };
    const handleDeletePrompt = (id: string) => {
        setPrompts(prompts.filter(p => p.id !== id));
    };

    // Brand Message Handlers
    const handleOpenBrandMessageModal = (message: BrandMessage | null) => {
        setSelectedBrandMessage(message);
        setBrandMessageModalOpen(true);
    };
    const handleCloseBrandMessageModal = () => {
        setBrandMessageModalOpen(false);
        setSelectedBrandMessage(null);
    };
    const handleSaveBrandMessage = (savedMessage: Omit<BrandMessage, 'id'> & { id?: string }) => {
        if (savedMessage.id) { // Edit
            setBrandMessages(brandMessages.map(bm => bm.id === savedMessage.id ? { ...bm, ...savedMessage } as BrandMessage : bm));
        } else { // Create
            const newMessage: BrandMessage = {
                ...(savedMessage as Omit<BrandMessage, 'id'>),
                id: new Date().toISOString(),
            };
            setBrandMessages(prev => [newMessage, ...prev]);
        }
    };
    const handleDeleteBrandMessage = (id: string) => {
        if (window.confirm("Are you sure you want to delete this message?")) {
            setBrandMessages(brandMessages.filter(bm => bm.id !== id));
        }
    };

    // CFP Handlers
    const handleOpenCFPModal = (cfp: CFP | null) => {
        setSelectedCFP(cfp);
        setCFPModalOpen(true);
    };
    const handleCloseCFPModal = () => {
        setCFPModalOpen(false);
        setSelectedCFP(null);
    };
    const handleSaveCFP = (savedCFP: Omit<CFP, 'id'> & { id?: string }) => {
        if (savedCFP.id) { // Edit
            setCFPs(cfps.map(c => c.id === savedCFP.id ? { ...c, ...savedCFP } as CFP : c));
        } else { // Create
            const newCFP: CFP = {
                ...(savedCFP as Omit<CFP, 'id'>),
                id: new Date().toISOString(),
            };
            setCFPs(prev => [newCFP, ...prev].sort((a,b) => new Date(a.submission_deadline).getTime() - new Date(b.submission_deadline).getTime()));
        }
    };
    const handleDeleteCFP = (id: string) => {
        if (window.confirm("Are you sure you want to delete this submission?")) {
            setCFPs(cfps.filter(c => c.id !== id));
        }
    };
    
    // Event Handlers
    const handleOpenEventModal = (event: Event | null) => {
        setSelectedEvent(event);
        setEventModalOpen(true);
    };
    const handleCloseEventModal = () => {
        setEventModalOpen(false);
        setSelectedEvent(null);
    };
    const handleSaveEvent = (savedEvent: Omit<Event, 'id'> & { id?: string }) => {
        if (savedEvent.id) { // Edit
            setEvents(events.map(e => e.id === savedEvent.id ? { ...e, ...savedEvent } as Event : e));
        } else { // Create
            const newEvent: Event = {
                ...(savedEvent as Omit<Event, 'id'>),
                id: new Date().toISOString(),
            };
            setEvents(prev => [newEvent, ...prev].sort((a,b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()));
        }
    };
    const handleDeleteEvent = (id: string) => {
        if (window.confirm("Are you sure you want to delete this event?")) {
            setEvents(events.filter(e => e.id !== id));
        }
    };

    return (
        <div className="flex h-screen font-sans">
            <Sidebar activeView={activeView} setActiveView={setActiveView} />
            <MainContent 
                activeView={activeView}
                isLoading={isLoading}
                prompts={prompts} 
                onOpenCreateModal={handleOpenCreatePromptModal} 
                onOpenViewModal={handleOpenViewPromptModal}
                brandMessages={brandMessages}
                onAddBrandMessage={() => handleOpenBrandMessageModal(null)}
                onEditBrandMessage={(msg) => handleOpenBrandMessageModal(msg)}
                onDeleteBrandMessage={handleDeleteBrandMessage}
                cfps={cfps}
                onAddCFP={() => handleOpenCFPModal(null)}
                onEditCFP={(cfp) => handleOpenCFPModal(cfp)}
                onDeleteCFP={handleDeleteCFP}
                events={events}
                onAddEvent={() => handleOpenEventModal(null)}
                onEditEvent={(event) => handleOpenEventModal(event)}
                onDeleteEvent={handleDeleteEvent}
                journeyStages={journeyStages}
                developerPersonas={developerPersonas}
                onJourneyDataUpdate={fetchJourneyData}
                onOpenPersonaManager={() => setPersonaModalOpen(true)}
                onOpenTouchpointDashboard={() => setTouchpointDashboardOpen(true)}
                onOpenMetricsDashboard={() => setMetricsDashboardOpen(true)}
                onOpenReportModal={() => setReportModalOpen(true)}
            />
            <PromptModal 
                isOpen={isPromptModalOpen}
                onClose={handleClosePromptModal}
                mode={promptModalMode}
                promptData={selectedPrompt}
                onSave={handleSavePrompt}
                onDelete={handleDeletePrompt}
            />
            <BrandMessageModal 
                isOpen={isBrandMessageModalOpen}
                onClose={handleCloseBrandMessageModal}
                onSave={handleSaveBrandMessage}
                messageData={selectedBrandMessage}
            />
            <CFPModal
                isOpen={isCFPModalOpen}
                onClose={handleCloseCFPModal}
                onSave={handleSaveCFP}
                cfpData={selectedCFP}
            />
            <EventModal
                isOpen={isEventModalOpen}
                onClose={handleCloseEventModal}
                onSave={handleSaveEvent}
                eventData={selectedEvent}
            />
            <PersonaManagerModal
                isOpen={isPersonaModalOpen}
                onClose={() => setPersonaModalOpen(false)}
                personas={developerPersonas}
                onPersonaUpdate={fetchJourneyData}
            />
            <TouchpointDashboardModal
                isOpen={isTouchpointDashboardOpen}
                onClose={() => setTouchpointDashboardOpen(false)}
                stages={journeyStages}
            />
            <MetricsDashboardModal
                isOpen={isMetricsDashboardOpen}
                onClose={() => setMetricsDashboardOpen(false)}
                stages={journeyStages}
            />
            <JourneyReportModal
                isOpen={isReportModalOpen}
                onClose={() => setReportModalOpen(false)}
                stages={journeyStages}
            />
        </div>
    );
};

const rootEl = document.getElementById('root');
if (rootEl) {
    const root = ReactDOM.createRoot(rootEl);
    root.render(<React.StrictMode><App /></React.StrictMode>);
}