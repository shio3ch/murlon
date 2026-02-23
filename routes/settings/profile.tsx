import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSession } from "../../lib/auth.ts";
import { userRepository } from "../../lib/repositories.ts";
import Header from "../../components/Header.tsx";
import ProfileSettings from "../../islands/ProfileSettings.tsx";

interface ProfilePageData {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    authProvider: string;
  };
}

export const handler: Handlers<ProfilePageData> = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/auth/login" },
      });
    }

    const user = await userRepository.findById(session.userId);

    if (!user) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/auth/login" },
      });
    }

    return ctx.render({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        authProvider: user.authProvider,
      },
    });
  },
};

export default function ProfilePage({ data }: PageProps<ProfilePageData>) {
  const { user } = data;

  return (
    <div class="min-h-screen bg-gray-50">
      <Header user={user} />
      <main class="max-w-2xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div class="text-sm text-gray-500 mb-4">
          <a href="/settings" class="hover:text-brand-600">設定</a>
          <span class="mx-1">/</span>
          <span class="text-gray-700">プロフィール設定</span>
        </div>

        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">プロフィール設定</h1>
          <p class="text-gray-500 mt-1">
            名前やアバター画像を変更できます
          </p>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <ProfileSettings
            initialName={user.name}
            initialAvatarUrl={user.avatarUrl}
            authProvider={user.authProvider}
          />
        </div>
      </main>
    </div>
  );
}
