
# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/9bde94ef-cc1b-48f1-86a0-8ab39ece6d53

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/9bde94ef-cc1b-48f1-86a0-8ab39ece6d53) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/9bde94ef-cc1b-48f1-86a0-8ab39ece6d53) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

---

# PPTGenie Knowledge Base - Product-Focused Documentation

## 1. Product Vision & Value Proposition

**Core Job-to-be-Done**: Help business professionals create multiple personalized PowerPoint presentations efficiently by automating the tedious process of manually customizing presentations for different clients, prospects, or scenarios.

**Primary User Pain Points Solved**:
- Manual copy-paste work for personalized presentations
- Risk of human error in data entry across multiple slides
- Time-consuming process of creating similar presentations for different clients
- Inconsistent formatting when manually editing presentations
- Scaling presentation creation for sales teams, marketing campaigns, or client deliverables

## 2. User Personas & Use Cases

**Primary Personas**:
- **Sales Representatives**: Need to create personalized pitch decks for different prospects
- **Marketing Managers**: Generate campaign materials for multiple clients/regions
- **Business Development Teams**: Create customized proposals and presentations
- **Account Managers**: Personalize client reports and presentations
- **Consultants**: Generate client-specific deliverables at scale

**Key Use Cases**:
- Sales team creating 50+ personalized pitch decks for different prospects
- Marketing creating region-specific campaign presentations
- HR generating personalized onboarding materials
- Account teams creating monthly client reports with specific data
- Event organizers creating sponsor-specific presentations

## 3. Product Features & User Journey

**Step 1: Template Upload**
- User uploads their PowerPoint template with placeholder variables (`{{company_name}}`, `{{revenue}}`, etc.)
- System extracts and validates all placeholders automatically
- Clear feedback on what variables were found

**Step 2: Data Upload** 
- User uploads CSV file with data for each presentation
- System validates that CSV headers match template placeholders
- Preview functionality to ensure data alignment

**Step 3: Batch Generation**
- System generates individual PowerPoint files for each row in CSV
- Real-time progress tracking
- Download all generated files as a zip

## 4. Content Guidelines & Best Practices

**Template Creation Best Practices**:
- Use clear, descriptive placeholder names (`{{client_company}}` not `{{c1}}`)
- Test templates with sample data before batch processing
- Keep consistent formatting across slides
- Use standard PowerPoint features (avoid complex animations)

**CSV Data Guidelines**:
- First row must contain headers matching template placeholders exactly
- Clean data (no special characters in critical fields)
- Include all required fields for every row
- Use consistent date/number formatting

## 5. User Experience Principles

**Simplicity First**: 3-step process that anyone can follow
**Error Prevention**: Validate inputs before processing
**Progress Transparency**: Clear feedback at each step
**Batch Efficiency**: Handle large datasets without performance issues
**Quality Assurance**: Preview capabilities to catch errors early

## 6. Success Metrics & KPIs

**User Success Indicators**:
- Time saved per presentation (target: 90% reduction)
- Error rate in generated presentations (target: <1%)
- User completion rate through full workflow (target: >85%)
- Batch size successfully processed (target: 100+ presentations)

**Business Value Delivered**:
- Hours saved per user per week
- Increased presentation consistency and quality
- Faster sales cycle due to quick proposal generation
- Reduced manual errors in client communications

## 7. Common User Scenarios & Solutions

**Scenario 1**: Sales team needs to create 50 pitch decks for upcoming trade show
- Solution: Upload master pitch template, CSV with prospect data, generate all presentations in minutes

**Scenario 2**: Marketing needs localized presentations for 20 different regions
- Solution: Template with region-specific placeholders, CSV with local data/messaging

**Scenario 3**: Account manager needs monthly reports for 30 clients
- Solution: Standardized report template, CSV export from CRM system

## 8. Quality Assurance & Validation

**Template Validation**:
- Ensure all placeholders use correct `{{variable}}` format
- Verify template doesn't use unsupported PowerPoint features
- Test with sample data before batch processing

**Data Validation**:
- CSV headers must exactly match template placeholders
- Required fields cannot be empty
- Special characters and formatting consistency

## 9. User Support & Troubleshooting

**Common Issues & Solutions**:
- Mismatched placeholder names → Clear error messages with suggestions
- Large file processing → Progress indicators and estimated time
- Template formatting issues → Best practice guidelines and examples

## 10. Product Roadmap Considerations

**Future Enhancements Based on User Needs**:
- Integration with CRM systems (Salesforce, HubSpot)
- Template marketplace for common use cases
- Advanced data transformation capabilities
- Real-time collaboration features
- Mobile app for reviewing generated presentations

