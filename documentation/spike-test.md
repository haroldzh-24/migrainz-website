# Spike Test — Payload CMS Project Content

## Studio Migrainz

Studio Migrainz is my personal studio and portfolio website. The site is meant to display my illustration, concept design, comics, products, and other creative projects while also functioning as an extension of the visual identity of Studio Migrainz.

Instead of making a normal portfolio site, I am building the website around an old computer/terminal aesthetic. It includes a startup sequence, blinking face animation, fake virus/system-compromised warning, ASCII elements, project pages, archive features, and other interactive elements.

The larger goal is for this to become the actual website I use for Studio Migrainz rather than something that only exists for this class.

## Original Plan

My original implementation plan was:

1. Build the basic site in Next.js.
2. Establish the terminal-style visual identity.
3. Build Projects, Tracker, Comics, and other main sections.
4. Add interactive elements and animations.
5. Connect Payload CMS.
6. Use the CMS to manage projects and images.
7. Continue adding more interactive features.
8. Populate the site with finished Studio Migrainz work.
9. Polish the website for desktop and mobile.

A major uncertainty was the CMS. The early versions of the site could use information that was directly written into the code, but that would become a problem as the site gets larger.

I do not want to edit the source code every time I finish a new illustration, comic, product, or project.

## Spike Question

The question for this spike was:

**Can Payload CMS be used to manage Studio Migrainz project content and reliably connect that content to the Next.js website?**

This was important because the CMS will determine whether the website can actually function as a long-term portfolio and studio website instead of just being a static class project.

## Test

I began implementing Payload CMS into the existing Studio Migrainz website.

The test involved setting up the Payload configuration, connecting the CMS to a PostgreSQL database, creating the required environment variables, setting up media storage, accessing the Payload admin interface, and testing the CMS alongside the existing Next.js site.

I also tested whether the project could still successfully build after adding the CMS infrastructure.

This was more complicated than simply adding an admin page. Payload became part of the actual architecture of the website.

The CMS required several pieces to work together:

- Next.js
- Payload CMS
- PostgreSQL
- Environment variables
- Media storage
- The existing frontend
- Production/build configuration

During development, the admin side of the site initially produced errors because the production environment did not have all of the configuration that Payload required. This helped expose which parts of the website were still dependent on my local development environment.

## Result

The spike showed that Payload CMS is a viable solution for Studio Migrainz, but implementing it is a larger part of the project than I originally expected.

The biggest result was realizing that I should not keep adding lots of frontend features while the content system underneath the site is unfinished.

The test also showed that there is a major difference between getting something to work locally and making the entire system reliable. Database configuration, environment variables, media storage, and the frontend all have to work together.

Because Studio Migrainz is supposed to continue growing after this class, solving this problem is more important than adding another visual feature right now.

## Revised Implementation Plan

Based on the spike, I changed the order of my development plan.

The revised plan is:

1. Keep the current Studio Migrainz interface and startup experience.
2. Stabilize Payload CMS and its database connection.
3. Finalize how projects are structured inside the CMS.
4. Make project pages retrieve their content from the CMS instead of relying on manually entered content.
5. Test image and media uploads.
6. Add several real Studio Migrainz projects through the CMS.
7. Make sure Projects and Archive correctly respond to CMS content.
8. Finish secondary features such as the project tracker and other interactive elements.
9. Polish animations, graphics, responsive behavior, and the overall interface.
10. Continue using the website as the actual Studio Migrainz site after the semester.

This changes the priority from adding as many features as possible to making the core system reliable first.

## End of Semester Goal

By the end of the semester, I want Studio Migrainz to function as an actual usable studio website.

The main benchmark is being able to create a project through Payload CMS, add its information and media, and have that content appear correctly on the website without rebuilding the project page manually.

On the creative side, I want to continue developing the website as something that feels connected to my artwork rather than being a neutral portfolio template. The startup sequence, fake system warnings, terminal interface, ASCII graphics, animations, and unusual navigation are part of that goal.

On the technical side, I am using the project to explore Next.js, React, Payload CMS, databases, dynamic content, media storage, deployment, and interactive web design.

The spike changed my approach because I now know the content system needs to be treated as one of the main features of the project instead of something that can simply be added near the end.