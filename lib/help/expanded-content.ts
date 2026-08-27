import type { HelpArticle } from './content';

export const EXPANDED_HELP_CATEGORIES = ['Board Engagement', 'Community Portal', 'Jarvis & Insights'] as const;

export const EXPANDED_HELP_ARTICLES: HelpArticle[] = [
  {
    slug: 'board-engagement-overview',
    title: 'Board Engagement: getting started',
    category: 'Board Engagement',
    summary: 'Bring board members, terms, meetings, and participation into one connected workspace.',
    blocks: [
      { type: 'paragraph', text: 'Board Engagement gives your organization a shared place to manage the people helping govern, advocate for, and advance the mission. Use it to keep board information and participation visible instead of scattered across spreadsheets and meeting notes.' },
      { type: 'heading', text: 'A simple way to start' },
      { type: 'steps', items: ['Open Board from the main navigation', 'Add or review your current board members', 'Confirm member terms and the information your team needs to track', 'Use meetings and participation to build a more complete picture of engagement', 'Review the board workspace regularly alongside fundraising and relationship activity'] },
      { type: 'callout', tone: 'info', text: 'Start with accurate membership and terms. You can deepen the engagement history over time instead of trying to recreate every historical board activity on day one.' },
    ],
  },
  {
    slug: 'community-portal-branding',
    title: 'Branding your Community Portal',
    category: 'Community Portal',
    summary: 'Add your organization logo and prepare the applicant-facing experience before publishing a funding opportunity.',
    blocks: [
      { type: 'paragraph', text: 'The Community Portal is the applicant-facing side of Grants & Allocations. Your organization logo helps applicants immediately understand whose funding opportunity they are viewing while Donor Success remains the technology powering the experience.' },
      { type: 'steps', items: ['Go to Settings', 'Open Community Portal settings', 'Upload or replace your organization logo', 'Review the portal preview', 'Confirm the experience before sharing a public funding opportunity'] },
      { type: 'callout', tone: 'info', text: 'Organization branding is managed by users with the appropriate organization settings permissions.' },
    ],
  },
  {
    slug: 'community-portal-applicant-experience',
    title: 'What applicants experience in the Community Portal',
    category: 'Community Portal',
    summary: 'Understand the public application, save-and-return, document upload, and status experience.',
    blocks: [
      { type: 'paragraph', text: 'The Community Portal is designed to make applying straightforward for community organizations while keeping the application connected to your internal Grants & Allocations workflow.' },
      { type: 'list', items: ['Applicants enter through a published funding opportunity', 'They can work through the application without needing access to your internal Donor Success account', 'They can save progress and return to continue later', 'Supporting documents can be uploaded as part of the application experience', 'After submission, applicants can return to view the status of their application'] },
      { type: 'callout', tone: 'info', text: 'Before distributing an application link broadly, preview the portal and test the experience the way an applicant will see it.' },
    ],
  },
  {
    slug: 'funding-rounds-workflow',
    title: 'Running a funding round from application to allocation',
    category: 'Grants',
    summary: 'A practical workflow for publishing, reviewing, scoring, allocating, and managing community funding.',
    blocks: [
      { type: 'paragraph', text: 'Funding Rounds organize the full decision cycle for a pool of community funding. The strongest setup starts with the decision process you want reviewers to follow, then configures the round around it.' },
      { type: 'steps', items: ['Create the funding round and define its timeline', 'Add the service or funding categories applicants can request', 'Configure the scoring rubric reviewers will use', 'Publish the opportunity when it is ready for applicants', 'Review submitted applications and compliance information', 'Score applications using the configured rubric', 'Record allocation decisions by requested category', 'Use grantee and grant reporting to follow the portfolio after decisions are made'] },
      { type: 'callout', tone: 'warning', text: 'Review categories, scoring criteria, dates, and applicant instructions before publishing. Those choices shape the applicant and reviewer experience.' },
    ],
  },
  {
    slug: 'reviewing-grant-applications',
    title: 'Reviewing and scoring grant applications',
    category: 'Grants',
    summary: 'Use compliance, category requests, reviewer scoring, and allocation information together.',
    blocks: [
      { type: 'paragraph', text: 'The application detail page brings the decision inputs together: applicant information, compliance certifications, requested service categories, reviewer evaluations, and allocation decisions.' },
      { type: 'list', items: ['Compliance certifications help reviewers confirm required eligibility statements', 'Service category requests show what the applicant is asking to fund and how the service will be delivered', 'Reviewer scores use the rubric configured on the funding round', 'Multiple evaluations contribute to the application’s overall reviewer picture', 'Authorized decision-makers can record allocations against individual category requests'] },
      { type: 'callout', tone: 'info', text: 'Grant permissions determine who can manage applications, score applications, and make funding-round or allocation decisions.' },
    ],
  },
  {
    slug: 'jarvis-insights',
    title: 'Using Jarvis to understand your donor data',
    category: 'Jarvis & Insights',
    summary: 'Ask questions in plain language and use your organization’s current donor data to guide action.',
    blocks: [
      { type: 'paragraph', text: 'Jarvis is the conversational insights experience inside Donor Success. Instead of starting with a report and figuring out which filters to use, start with the question you are trying to answer.' },
      { type: 'heading', text: 'Questions to try' },
      { type: 'list', items: ['Which donors need attention right now?', 'What is happening with our retention?', 'Where is our major-gift pipeline strongest or weakest?', 'Which donor segments should we focus on?', 'What patterns should I pay attention to in our current donor data?'] },
      { type: 'callout', tone: 'info', text: 'Use Jarvis to explore and frame the question, then open the relevant donor records, pipeline, or reports when you need to work the underlying relationships and details.' },
    ],
  },
  {
    slug: 'profile-and-organization-branding',
    title: 'Updating your profile and organization logo',
    category: 'Team & Settings',
    summary: 'Keep your display name current and manage the organization logo used in customer-facing experiences.',
    blocks: [
      { type: 'heading', text: 'Your profile' },
      { type: 'steps', items: ['Go to Settings', 'Find Your profile', 'Update the display name you want teammates to see', 'Save your changes'] },
      { type: 'heading', text: 'Organization logo' },
      { type: 'paragraph', text: 'Administrators with organization settings access can upload or replace the organization logo. The logo is stored for the organization and can be used in branded customer-facing experiences such as the Community Portal.' },
      { type: 'callout', tone: 'info', text: 'Profile settings are personal to you. Organization branding affects the shared organization experience, so it is permission-controlled.' },
    ],
  },
];
