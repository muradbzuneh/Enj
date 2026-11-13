/**
 * ENJ Social Media Platform - Main Application Component
 * Integrates with Express + Prisma + Better Auth backend.
 * Provides ThemeProvider (Light by default, Dark selectable), AuthProvider, and ToastProvider.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './context/ToastContext';
import { Preloader } from './components/ui/Preloader';
import { MainLayout } from './components/layout/MainLayout';
import { HomeFeedPage } from './pages/home/HomeFeedPage';
import { ExplorePage } from './pages/explore/ExplorePage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { SettingsProfilePage } from './pages/settings/SettingsProfilePage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { SearchPage } from './pages/search/SearchPage';
import { ReelsPage } from './pages/reels/ReelsPage';
import { MessagesPage } from './pages/messages/MessagesPage';
import { HumanizePage } from './pages/humanize/HumanizePage';
import { PostDetailModal } from './components/post/PostDetailModal';
import { EditPostModal } from './components/post/EditPostModal';
import type { Post } from './types';

function RouterApp() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [showPreloader, setShowPreloader] = useState(true);

  // Route state
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  // Active post for discussion modal
  const [activeDiscussionPost, setActiveDiscussionPost] = useState<Post | null>(null);

  // Active post for edit modal
  const [activeEditPost, setActiveEditPost] = useState<Post | null>(null);

  // Post newly created from global composer to immediately update feed
  const [newlyCreatedPost, setNewlyCreatedPost] = useState<Post | null>(null);

  // Search query state
  const [searchQuery, setSearchQuery] = useState('');

  // Global composer modal state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [initialComposeText, setInitialComposeText] = useState('');

  // Handle browser popstate
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to !== window.location.pathname) {
      window.history.pushState({}, '', to);
    }
    setCurrentPath(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleProfileClick = useCallback((identifier: string | null | undefined) => {
    if (identifier) {
      navigate(`/profile/${identifier}`);
    } else {
      navigate('/explore');
    }
  }, [navigate]);

  const handleHashtagClick = useCallback((tag: string) => {
    navigate(`/search?q=${encodeURIComponent(tag)}`);
  }, [navigate]);

  // Protected route redirects
  useEffect(() => {
    if (!isAuthLoading) {
      if ((currentPath === '/settings' || currentPath.startsWith('/settings')) && !user) {
        navigate('/login');
      }
    }
  }, [currentPath, user, isAuthLoading, navigate]);

  // Determine current view
  let pageContent: React.ReactNode = null;

  if (currentPath === '/login') {
    pageContent = <LoginPage onNavigate={navigate} />;
  } else if (currentPath === '/signup') {
    pageContent = <SignupPage onNavigate={navigate} />;
  } else if (currentPath === '/reels') {
    pageContent = (
      <ReelsPage
        onProfileClick={handleProfileClick}
        onCommentClick={(post) => setActiveDiscussionPost(post)}
      />
    );
  } else if (currentPath.startsWith('/messages')) {
    const convId = currentPath.replace('/messages/', '').split('/')[0] || undefined;
    pageContent = (
      <MessagesPage
        initialConversationId={convId}
      />
    );
  } else if (currentPath === '/humanize') {
    pageContent = (
      <HumanizePage
        onOpenComposeWithText={(text) => {
          setInitialComposeText(text);
          setIsComposeOpen(true);
        }}
      />
    );
  } else if (currentPath === '/explore') {
    pageContent = (
      <ExplorePage
        onProfileClick={handleProfileClick}
        onCommentClick={(post) => setActiveDiscussionPost(post)}
        onEditClick={(post) => setActiveEditPost(post)}
        onNavigate={navigate}
        onHashtagClick={handleHashtagClick}
      />
    );
  } else if (currentPath.startsWith('/profile/')) {
    const username = currentPath.replace('/profile/', '').split('/')[0] || '';
    pageContent = (
      <ProfilePage
        username={username}
        onNavigate={navigate}
        onCommentClick={(post) => setActiveDiscussionPost(post)}
        onEditClick={(post) => setActiveEditPost(post)}
      />
    );
  } else if (currentPath === '/settings' || currentPath.startsWith('/settings')) {
    pageContent = <SettingsProfilePage onNavigate={navigate} />;
  } else if (currentPath === '/search') {
    pageContent = (
      <SearchPage
        initialQuery={searchQuery}
        onProfileClick={handleProfileClick}
        onCommentClick={(post) => setActiveDiscussionPost(post)}
        onEditClick={(post) => setActiveEditPost(post)}
        onHashtagClick={handleHashtagClick}
      />
    );
  } else {
    // Default Home / Feed
    pageContent = (
      <HomeFeedPage
        onProfileClick={handleProfileClick}
        onCommentClick={(post) => setActiveDiscussionPost(post)}
        onEditClick={(post) => setActiveEditPost(post)}
        newlyCreatedPost={newlyCreatedPost}
        onHashtagClick={handleHashtagClick}
      />
    );
  }

  const isAuthPage = currentPath === '/login' || currentPath === '/signup';

  return (
    <>
      {showPreloader && <Preloader onComplete={() => setShowPreloader(false)} />}

      {isAuthPage ? (
        <div className="min-h-screen bg-white dark:bg-[#0f1115] text-slate-900 dark:text-[#e1e1e1] transition-colors">
          {pageContent}
        </div>
      ) : (
        <MainLayout
          currentPath={currentPath}
          onNavigate={navigate}
          onPostCreated={(post) => setNewlyCreatedPost(post)}
          searchQuery={searchQuery}
          onSearchChange={(val) => setSearchQuery(val)}
          onSearchSubmit={() => navigate('/search')}
          isComposeOpen={isComposeOpen}
          onOpenCompose={() => {
            setInitialComposeText('');
            setIsComposeOpen(true);
          }}
          onCloseCompose={() => setIsComposeOpen(false)}
          initialComposeText={initialComposeText}
        >
          {pageContent}
        </MainLayout>
      )}

      {/* Discussion / Comments Modal */}
      <PostDetailModal
        post={activeDiscussionPost}
        isOpen={Boolean(activeDiscussionPost)}
        onClose={() => setActiveDiscussionPost(null)}
        onPostUpdated={(updated) => {
          setActiveDiscussionPost(updated);
          setNewlyCreatedPost(updated);
        }}
        onPostDeleted={() => {
          setActiveDiscussionPost(null);
        }}
        onProfileClick={handleProfileClick}
        onEditClick={(post) => {
          setActiveDiscussionPost(null);
          setActiveEditPost(post);
        }}
      />

      {/* Edit Post Modal */}
      <EditPostModal
        post={activeEditPost}
        isOpen={Boolean(activeEditPost)}
        onClose={() => setActiveEditPost(null)}
        onPostUpdated={(updated) => {
          setNewlyCreatedPost(updated);
        }}
      />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <SocketProvider>
            <RouterApp />
          </SocketProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
