/**
 * Seed script - realistic demo content for ENJ.
 *
 * Run:  npm run db:seed        (from apps/api)
 *
 * Creates users with handles and avatars, posts with real images and videos,
 * a follow graph, likes, comments and stories so that the feed, Explore grid,
 * Reels and the profile pages all look like a real social platform instead of
 * an empty database.
 */

import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const IMG = (id: string, w = 900) =>
  `https://images.unsplash.com/${id}?w=${w}&auto=format&fit=crop&q=80`;

/* Sample videos hosted on Google's public bucket (CORS friendly). */
const VIDEO = (name: string) =>
  `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/${name}.mp4`;

const USERS = [
  {
    name: 'Maya Chen',
    username: 'mayachen',
    bio: 'Product designer chasing good light and better coffee.',
    image: IMG('photo-1494790108377-be9c29b29330', 300),
    posts: [
      {
        content: 'Golden hour on the rooftop. Some days the city actually agrees to be beautiful. ✨ #citylight',
        mediaUrl: IMG('photo-1514565131-fce0801e5785'),
      },
      {
        content: 'Sketchbook spread from this morning. The messy first draft is always the honest one.',
        mediaUrl: IMG('photo-1517842645767-c639042777db'),
      },
      {
        content: 'Trying a new filter workflow today — tell me which one you prefer?',
        mediaUrl: IMG('photo-1452587925148-ce544e77e70d'),
      },
    ],
  },
  {
    name: 'Arjun Patel',
    username: 'arjunpatel',
    bio: 'Film photographer. Chasing light, not landscapes.',
    image: IMG('photo-1500648767791-00dcc994a43e', 300),
    posts: [
      {
        content: 'Shot this on a 50mm at f/1.4 — the bokeh did all the work for me. 📷 #streetphotography',
        mediaUrl: IMG('photo-1449824913935-59a10b8d2000'),
      },
      {
        content: 'Desert dawn. Ten minutes of silence before anyone woke up. 🏜️',
        mediaUrl: IMG('photo-1509316975850-ff9c5deb0cd9'),
      },
      {
        content: 'A quick clip from the ridge trail this weekend.',
        mediaUrl: VIDEO('ForBiggerBlazes'),
      },
    ],
  },
  {
    name: 'Sofia Reyes',
    username: 'sofiareyes',
    bio: 'Home cook, ceramics learner, chronic overthinker.',
    image: IMG('photo-1534528741775-53994a69daeb', 300),
    posts: [
      {
        content: 'Fresh pasta night. Hand-rolled, slightly uneven, completely worth it. 🍝',
        mediaUrl: IMG('photo-1556909114-f6e7ad7d3136'),
      },
      {
        content: 'The succulent wall is finally alive 🌿 three months of patience paid off.',
        mediaUrl: IMG('photo-1416879595882-3373a0480b5b'),
      },
      {
        content: 'First bowl from the wheel. It wobbles. I love it.',
        mediaUrl: IMG('photo-1493106819501-66d381c466f1'),
      },
    ],
  },
  {
    name: 'Liam Osei',
    username: 'liamosei',
    bio: 'Runner, cook, and chronic over-planner.',
    image: IMG('photo-1507003211169-0a1dd7228f2d', 300),
    posts: [
      {
        content: 'Sunrise run along the coast. 12km before the city woke up. 🏃‍♂️',
        mediaUrl: IMG('photo-1502680390548-bdbac40e4a20'),
      },
      {
        content: 'Trail conditions were perfect this morning.',
        mediaUrl: VIDEO('ForBiggerEscapes'),
      },
    ],
  },
  {
    name: 'Noor Haddad',
    username: 'noorhaddad',
    bio: 'Architect. Interested in why cities feel the way they do.',
    image: IMG('photo-1487412720507-e7ab37603c6f', 300),
    posts: [
      {
        content: 'Clean lines and bold shapes. Concrete has a language, you just have to listen. 🏙️',
        mediaUrl: IMG('photo-1486325212027-8081e485255e'),
      },
      {
        content: 'Morning pour-over. Ritual, not routine. ☕',
        mediaUrl: IMG('photo-1495474472287-4d71bcdd2085'),
      },
    ],
  },
  {
    name: 'Tomas Alvarez',
    username: 'tomasalvarez',
    bio: 'Making videos about ordinary places.',
    image: IMG('photo-1506794778202-cad84cf45f1d', 300),
    posts: [
      {
        content: 'Twenty seconds of nothing but waves. That is the whole video. 🌊',
        mediaUrl: VIDEO('ForBiggerFun'),
      },
      {
        content: 'Mountain trails calling. 🏔️',
        mediaUrl: IMG('photo-1464822759023-fed622ff2c3b'),
      },
      {
        content: 'Anyone else keep a notebook just for places they want to go?',
        mediaUrl: IMG('photo-1503220317375-aaad61436b1b'),
      },
    ],
  },
];

const COMMENTS = [
  'This is unreal 🔥',
  'Okay this is going straight to my moodboard.',
  'The light here is everything.',
  'Saving this for later, inspiration!',
  'How long was the hike?',
  'Genuinely one of the best posts here.',
  'Need to try this.',
  'The colours are perfect.',
];

const STORY_GRADIENTS = [
  'from-[#FF3366] via-[#FF5E7E] to-[#FFAA00]',
  'from-[#4FB8B2] via-[#328F97] to-[#2F6A4A]',
  'from-[#6366F1] via-[#8B5CF6] to-[#EC4899]',
  'from-[#F59E0B] via-[#EF4444] to-[#7C2D12]',
];

async function main() {
  console.log("Seeding ENJ demo content...\n");

  const createdUsers: string[] = [];

  for (const spec of USERS) {
    const email = `${spec.username}@enj.demo`;
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: randomUUID(),
          email,
          emailVerified: true,
          name: spec.name,
          username: spec.username,
          bio: spec.bio,
          image: spec.image,
        },
      });
      createdUsers.push(user.id);
      console.log(`  + user @${spec.username}`);
    } else {
      createdUsers.push(user.id);
      console.log(`  = user @${spec.username} (exists)`);
    }

    // Posts
    for (const post of spec.posts) {
      const existing = await prisma.post.findFirst({
        where: { content: post.content },
      });
      if (existing) continue;

      await prisma.post.create({
        data: { content: post.content, mediaUrl: post.mediaUrl, authorId: user.id },
      });
    }

    // Story (expires in 24h)
    const storyExists = await prisma.story.findFirst({
      where: { authorId: user.id, content: { contains: "today" } },
    });
    if (!storyExists) {
      await prisma.story.create({
        data: {
          authorId: user.id,
          content: `Something good happened today ✨`,
          mediaUrl: spec.posts[0]?.mediaUrl ?? null,
          gradient: STORY_GRADIENTS[createdUsers.indexOf(user.id) % STORY_GRADIENTS.length],
          moodEmoji: "✨",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  const allUsers = await prisma.user.findMany({ where: { id: { in: createdUsers } } });
  const allPosts = await prisma.post.findMany({
    where: { authorId: { in: createdUsers } },
    include: { _count: { select: { likes: true, comments: true } } },
  });

  // Follow graph: everybody follows the first two creators, plus a chain.
  let followCount = 0;
  for (const follower of allUsers) {
    for (const target of allUsers) {
      if (follower.id === target.id) continue;
      const shouldFollow = target.username === "mayachen" || target.username === "arjunpatel" || follower.id < target.id;
      if (!shouldFollow) continue;

      const existing = await prisma.follow.findFirst({
        where: { followerId: follower.id, followingId: target.id },
      });
      if (existing) continue;

      await prisma.follow.create({
        data: { followerId: follower.id, followingId: target.id },
      });
      followCount++;
    }
  }
  console.log(`  + ${followCount} follows`);

  // Likes - older posts get more, like a real trending ranking.
  let likeCount = 0;
  for (const post of allPosts) {
    const target = Math.min(allUsers.length - 1, Math.floor(Math.random() * allUsers.length));
    for (const liker of allUsers.slice(0, target + 1)) {
      if (liker.id === post.authorId) continue;
      const existing = await prisma.like.findFirst({
        where: { userId: liker.id, postId: post.id },
      });
      if (existing) continue;
      await prisma.like.create({ data: { userId: liker.id, postId: post.id } });
      likeCount++;
    }
  }
  console.log(`  + ${likeCount} likes`);

  // Comments
  let commentCount = 0;
  for (const post of allPosts) {
    const n = Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const commenter = allUsers[Math.floor(Math.random() * allUsers.length)];
      if (commenter.id === post.authorId) continue;
      const existing = await prisma.comment.findFirst({
        where: { postId: post.id, authorId: commenter.id, content: COMMENTS[i % COMMENTS.length] },
      });
      if (existing) continue;
      await prisma.comment.create({
        data: {
          postId: post.id,
          authorId: commenter.id,
          content: COMMENTS[Math.floor(Math.random() * COMMENTS.length)],
        },
      });
      commentCount++;
    }
  }
  console.log(`  + ${commentCount} comments`);

  console.log("\nDone. Reload the app to see the populated feed, Explore grid and Reels.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
