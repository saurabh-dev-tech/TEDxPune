import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C, Fonts } from '@/constants/theme';
import { Avatar } from '@/components/tedx/avatar';
import { TalkThumb } from '@/components/tedx/talk-thumb';
import { useAuth } from '@/lib/auth/context';
import { PostsApi } from '@/lib/api/posts';

const KIND_CHIPS = ['Thought', 'Ask', 'Quote', 'Event'];

function KindChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.kindChip, active && styles.kindChipActive]}
    >
      <Text style={[styles.kindChipText, active && styles.kindChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ToolBtn({
  icon,
  label,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.toolBtn, active && styles.toolBtnActive]}
    >
      <Text style={{ fontSize: 16, color: active ? C.red : C.slate }}>{icon}</Text>
      <Text style={[styles.toolBtnLabel, active && { color: C.red }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ComposeScreen() {
  const router = useRouter();
  const { user, claims } = useAuth();
  const myName = user?.fullName ?? (claims?.name as string | undefined) ?? 'You';
  const myAvatarUrl =
    user?.avatarUrl ?? (claims?.picture as string | undefined) ?? null;
  const [kind, setKind] = useState('Thought');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [publishing, setPublishing] = useState(false);

  const composedBody = [title.trim(), body.trim()].filter(Boolean).join('\n\n');
  const charCount = composedBody.length;
  const canPublish = composedBody.length > 0 && composedBody.length <= 3000 && !publishing;

  const handlePublish = async () => {
    if (!canPublish) return;
    setPublishing(true);
    try {
      // Prepend the chosen "kind" as a lightweight tag so the feed can render it
      const payload = kind === 'Thought' ? composedBody : `[${kind}]\n${composedBody}`;
      await PostsApi.create(payload);
      router.back();
    } catch (err: any) {
      Alert.alert('Could not publish', err?.message ?? 'Try again in a moment.');
    } finally {
      setPublishing(false);
    }
  };

  const handleCancel = () => {
    if (composedBody.length > 0) {
      Alert.alert('Discard draft?', 'Your draft will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity onPress={handleCancel}>
              <Text style={{ fontSize: 22, color: C.ink, lineHeight: 26 }}>✕</Text>
            </TouchableOpacity>
            <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: C.faint, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              New post · draft
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.publishBtn, !canPublish && { opacity: 0.5 }]}
            activeOpacity={0.8}
            onPress={handlePublish}
            disabled={!canPublish}
          >
            {publishing ? (
              <ActivityIndicator color={C.paper} size="small" />
            ) : (
              <Text style={{ color: C.paper, fontSize: 12.5, fontWeight: '600' }}>Publish</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Kind selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}
          contentContainerStyle={{ gap: 7 }}
        >
          {KIND_CHIPS.map(k => (
            <KindChip key={k} label={k} active={kind === k} onPress={() => setKind(k)} />
          ))}
        </ScrollView>

        {/* Author row */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={myName} size={40} url={myAvatarUrl} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: C.ink }}>{myName}</Text>
            <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: C.muted, letterSpacing: 0.5 }}>
              Posting to{' '}
              <Text style={{ color: C.ink }}>Pune · Community</Text>
            </Text>
          </View>
          <View style={styles.audienceBadge}>
            <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: C.slate, letterSpacing: 1, textTransform: 'uppercase' }}>
              Members only ▾
            </Text>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title input — editorial serif */}
          <TextInput
            style={styles.titleInput}
            placeholder="Write a title…"
            placeholderTextColor={C.faint}
            multiline
            value={title}
            onChangeText={setTitle}
            editable={!publishing}
          />

          {/* Body input */}
          <TextInput
            style={styles.bodyInput}
            placeholder="Share your idea, question, or perspective…"
            placeholderTextColor={C.muted}
            multiline
            value={body}
            onChangeText={setBody}
            editable={!publishing}
          />

          {/* Mention chip example */}
          <View style={{ marginBottom: 20, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <View style={styles.mentionChip}>
              <Text style={{ color: C.red, fontWeight: '700' }}>@</Text>
              <Text style={{ fontSize: 12.5, color: C.red, fontWeight: '500' }}> Dr. Meera Joshi</Text>
            </View>
            <Text style={{ color: C.muted, fontSize: 13 }}>— would love your take.</Text>
          </View>

          {/* Linked talk reference */}
          <View style={styles.linkedTalk}>
            <View style={{ width: 66, height: 52, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
              <TalkThumb seed="Teaching a machine to read Marathi" height={52} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: Fonts.mono, fontSize: 9, color: C.faint, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
                ↳ Linked talk · 2024
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '600', lineHeight: 16, marginBottom: 2, color: C.ink }} numberOfLines={1}>
                Teaching a machine to read Marathi
              </Text>
              <Text style={{ fontSize: 11, color: C.muted }}>Aditi Kulkarni · 13:55</Text>
            </View>
            <TouchableOpacity style={styles.removeTalk}>
              <Text style={{ color: C.slate, fontSize: 14 }}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Topic tags */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {['AI', 'Writing'].map(t => (
              <View key={t} style={styles.topicTag}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: C.ink }}>{t}</Text>
              </View>
            ))}
            <View style={styles.topicTagDashed}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: C.muted }}>+ add topic</Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom toolbar */}
        <View style={styles.bottomToolbar}>
          <ToolBtn icon="🖼" label="Photo" />
          <ToolBtn icon="📅" label="Event" />
          <ToolBtn icon="▶" label="Talk" active />
          <ToolBtn icon="📎" label="File" />
          <View style={{ marginLeft: 'auto' }}>
            <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: charCount > 2800 ? C.red : C.faint, letterSpacing: 0.5 }}>
              {charCount.toLocaleString()} / 3,000
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.hair,
  },
  publishBtn: {
    height: 32,
    paddingHorizontal: 16,
    backgroundColor: C.red,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.hair,
  },
  kindChipActive: {
    backgroundColor: C.ink,
    borderColor: C.ink,
  },
  kindChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: C.slate,
  },
  kindChipTextActive: {
    color: C.paper,
  },
  audienceBadge: {
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  titleInput: {
    fontFamily: Fonts.serif,
    fontSize: 26,
    letterSpacing: -0.5,
    lineHeight: 30,
    color: C.ink,
    marginBottom: 14,
    minHeight: 60,
  },
  bodyInput: {
    fontSize: 15,
    lineHeight: 23,
    color: C.ink,
    marginBottom: 18,
    minHeight: 80,
  },
  mentionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.redSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: `${C.red}20`,
  },
  linkedTalk: {
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  removeTalk: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: C.mist,
    borderRadius: 6,
  },
  topicTagDashed: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.hair,
    borderRadius: 6,
  },
  bottomToolbar: {
    borderTopWidth: 1,
    borderTopColor: C.hair,
    backgroundColor: C.paper,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
  },
  toolBtnActive: {
    backgroundColor: C.redSoft,
  },
  toolBtnLabel: {
    fontSize: 11.5,
    fontWeight: '500',
    color: C.slate,
  },
});
