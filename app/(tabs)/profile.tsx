import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, Fonts } from '@/constants/theme';
import { Avatar } from '@/components/tedx/avatar';
import { useAuth } from '@/lib/auth/context';
import { UsersApi } from '@/lib/api/users';
import { nameFromClaims, pictureFromClaims } from '@/lib/auth/jwt';

function SectionHeader({ children }: { children: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <View style={{ width: 12, height: 1, backgroundColor: C.red }} />
      <Text style={{
        fontFamily: Fonts.mono,
        fontSize: 10,
        color: C.slate,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        fontWeight: '600',
      }}>
        {children}
      </Text>
    </View>
  );
}

function FieldLabel({ children }: { children: string }) {
  return (
    <Text style={styles.fieldLabel}>{children}</Text>
  );
}

function InfoRow({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <Text style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{icon}</Text>
      <Text style={{ fontSize: 14, color: C.slate, flex: 1 }}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, claims, refreshUser, setUser, signOut } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit field state
  const [editName, setEditName] = useState('');
  const [editHeadline, setEditHeadline] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editLinkedin, setEditLinkedin] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editX, setEditX] = useState('');

  useEffect(() => {
    refreshUser().catch(() => {});
  }, [refreshUser]);

  const openEdit = () => {
    setEditName(user?.fullName ?? '');
    setEditHeadline(user?.headline ?? '');
    setEditBio(user?.bio ?? '');
    setEditAvatarUrl(user?.avatarUrl ?? '');
    setEditLocation(user?.location ?? '');
    setEditWebsite(user?.website ?? '');
    setEditLinkedin(user?.linkedin ?? '');
    setEditWhatsapp(user?.whatsapp ?? '');
    setEditInstagram(user?.instagram ?? '');
    setEditX(user?.x ?? '');
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await UsersApi.updateMe({
        fullName: editName.trim()    || undefined,
        headline: editHeadline.trim() || undefined,
        bio:      editBio.trim()     || undefined,
        avatarUrl: editAvatarUrl.trim() || undefined,
        location: editLocation.trim() || undefined,
        website:  editWebsite.trim() || undefined,
        linkedin: editLinkedin.trim() || undefined,
        whatsapp: editWhatsapp.trim() || undefined,
        instagram: editInstagram.trim() || undefined,
        x: editX.trim() || undefined,
      });
      setUser(updated);
      setShowEditModal(false);
    } catch (err: any) {
      Alert.alert('Could not save', err?.message ?? 'Try again later.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out?', "You'll need to sign in again to access the community.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  // Resolved display values — backend first, JWT claims as fallback
  const displayName    = user?.fullName   ?? nameFromClaims(claims) ?? '—';
  const displayEmail   = user?.email      ?? (claims?.email as string | undefined)   ?? null;
  const displayRole    = user?.role       ?? (claims?.role  as string | undefined)   ?? null;
  const displayHeadline = user?.headline  ?? null;
  const displayBio     = user?.bio        ?? null;
  const displayLocation = user?.location  ?? null;
  const displayWebsite = user?.website    ?? null;
  const displayLinkedin = user?.linkedin   ?? null;
  const displayWhatsapp = user?.whatsapp   ?? null;
  const displayInstagram = user?.instagram ?? null;
  const displayX        = user?.x         ?? null;
  const avatarUrl      = user?.avatarUrl  ?? pictureFromClaims(claims) ?? null;
  const joinedYear     = user?.createdAt  ? new Date(user.createdAt).getFullYear() : null;
  const postsCount     = user?.postsCount ?? null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Banner */}
        <View style={styles.banner}>
          {[...Array(11)].map((_, i) => (
            <View key={i} style={{
              position: 'absolute', top: 0, bottom: 0,
              left: i * 38 - 20, width: 1,
              backgroundColor: 'rgba(255,255,255,0.04)',
              transform: [{ rotate: '25deg' }],
            }} />
          ))}
          <View style={{ position: 'absolute', bottom: 0, left: 0, height: 5, width: '38%', backgroundColor: C.red }} />
          <Text style={styles.bannerMeta}>
            Pune
            {displayRole ? ` · ${displayRole.toLowerCase()}` : ' · member'}
            {joinedYear ? ` · ${joinedYear}` : ''}
          </Text>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 20 }}>

          {/* Avatar + Edit button */}
          <View style={{ marginTop: -38, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Avatar name={displayName} size={86} ring url={avatarUrl} />
            <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
              <Text style={{ color: C.paper, fontWeight: '600', fontSize: 13 }}>Edit profile</Text>
            </TouchableOpacity>
          </View>

          {/* Name + headline */}
          <Text style={styles.displayName}>{displayName}</Text>
          {displayHeadline ? (
            <Text style={styles.displayHeadline}>{displayHeadline}</Text>
          ) : (
            <TouchableOpacity onPress={openEdit}>
              <Text style={[styles.displayHeadline, { color: C.faint, fontStyle: 'italic' }]}>
                Add a headline…
              </Text>
            </TouchableOpacity>
          )}

          {/* Meta chips */}
          <View style={styles.metaRow}>
            {displayRole && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{displayRole.toLowerCase()}</Text>
              </View>
            )}
            {joinedYear && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>since {joinedYear}</Text>
              </View>
            )}
            <View style={[styles.chip, { backgroundColor: '#dcfce7' }]}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#16a34a', marginRight: 4 }} />
              <Text style={[styles.chipText, { color: '#15803d' }]}>online</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{postsCount ?? '—'}</Text>
              <Text style={styles.statLabel}>posts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statValue}>—</Text>
              <Text style={styles.statLabel}>connections</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statValue}>—</Text>
              <Text style={styles.statLabel}>talks</Text>
            </View>
          </View>

          {/* About */}
          <View style={{ marginBottom: 24 }}>
            <SectionHeader>About</SectionHeader>
            {displayBio ? (
              <Text style={{ fontSize: 14, lineHeight: 22, color: C.ink }}>{displayBio}</Text>
            ) : (
              <TouchableOpacity onPress={openEdit}>
                <Text style={{ fontSize: 14, lineHeight: 22, color: C.faint, fontStyle: 'italic' }}>
                  Add a bio to tell the community what you're about…
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Contact details from API */}
          {(displayEmail || displayLocation || displayWebsite || displayLinkedin || displayWhatsapp || displayInstagram || displayX) && (
            <View style={{ marginBottom: 24 }}>
              <SectionHeader>Details</SectionHeader>
              {displayEmail    && <InfoRow icon="✉️" value={displayEmail} />}
              {displayLocation && <InfoRow icon="📍" value={displayLocation} />}
              {displayWebsite  && <InfoRow icon="🔗" value={displayWebsite} />}
              {displayLinkedin  && <InfoRow icon="💼" value={`LinkedIn: ${displayLinkedin}`} />}
              {displayWhatsapp  && <InfoRow icon="💬" value={`WhatsApp: ${displayWhatsapp}`} />}
              {displayInstagram && <InfoRow icon="📸" value={`Instagram: ${displayInstagram}`} />}
              {displayX         && <InfoRow icon="𝕏" value={`X: ${displayX}`} />}
            </View>
          )}

        </View>
      </ScrollView>

      {/* ── Edit profile modal ── */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Modal top bar */}
            <View style={styles.editTopBar}>
              <TouchableOpacity onPress={() => setShowEditModal(false)} disabled={saving}>
                <Text style={{ fontSize: 14, color: C.slate }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: C.faint, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                Edit profile
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator color={C.red} />
                  : <Text style={{ fontSize: 14, color: C.red, fontWeight: '600' }}>Save</Text>
                }
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>

              {/* Avatar preview */}
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <Avatar name={editName || displayName} size={80} ring url={editAvatarUrl || null} />
                <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: C.faint, marginTop: 8, letterSpacing: 1 }}>
                  PROFILE PHOTO
                </Text>
              </View>

              {/* ── Basic ── */}
              <View style={styles.editSection}>
                <Text style={styles.editSectionTitle}>Basic info</Text>

                <FieldLabel>Full name</FieldLabel>
                <TextInput
                  style={styles.field}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Your full name"
                  placeholderTextColor={C.faint}
                  maxLength={100}
                  editable={!saving}
                />

                <FieldLabel>Avatar URL</FieldLabel>
                <TextInput
                  style={styles.field}
                  value={editAvatarUrl}
                  onChangeText={setEditAvatarUrl}
                  placeholder="https://…"
                  placeholderTextColor={C.faint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  editable={!saving}
                />
              </View>

              {/* ── About ── */}
              <View style={styles.editSection}>
                <Text style={styles.editSectionTitle}>About you</Text>

                <FieldLabel>Headline</FieldLabel>
                <TextInput
                  style={styles.field}
                  value={editHeadline}
                  onChangeText={setEditHeadline}
                  placeholder="One-liner about what you do"
                  placeholderTextColor={C.faint}
                  maxLength={160}
                  editable={!saving}
                />
                <Text style={styles.charCount}>{editHeadline.length} / 160</Text>

                <FieldLabel>Bio</FieldLabel>
                <TextInput
                  style={[styles.field, { minHeight: 100 }]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Tell the community what you're about, what you've worked on, or what ideas excite you."
                  placeholderTextColor={C.faint}
                  maxLength={500}
                  multiline
                  textAlignVertical="top"
                  editable={!saving}
                />
                <Text style={styles.charCount}>{editBio.length} / 500</Text>
              </View>

              {/* ── Location & Web ── */}
              <View style={styles.editSection}>
                <Text style={styles.editSectionTitle}>Location & web</Text>

                <FieldLabel>Location</FieldLabel>
                <TextInput
                  style={styles.field}
                  value={editLocation}
                  onChangeText={setEditLocation}
                  placeholder="City, country"
                  placeholderTextColor={C.faint}
                  maxLength={100}
                  editable={!saving}
                />

                <FieldLabel>Website</FieldLabel>
                <TextInput
                  style={styles.field}
                  value={editWebsite}
                  onChangeText={setEditWebsite}
                  placeholder="https://yoursite.com"
                  placeholderTextColor={C.faint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  editable={!saving}
                />

                <FieldLabel>LinkedIn</FieldLabel>
                <TextInput
                  style={styles.field}
                  value={editLinkedin}
                  onChangeText={setEditLinkedin}
                  placeholder="LinkedIn Username / URL"
                  placeholderTextColor={C.faint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!saving}
                />

                <FieldLabel>WhatsApp</FieldLabel>
                <TextInput
                  style={styles.field}
                  value={editWhatsapp}
                  onChangeText={setEditWhatsapp}
                  placeholder="WhatsApp Number"
                  placeholderTextColor={C.faint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="phone-pad"
                  editable={!saving}
                />

                <FieldLabel>Instagram</FieldLabel>
                <TextInput
                  style={styles.field}
                  value={editInstagram}
                  onChangeText={setEditInstagram}
                  placeholder="Instagram Username"
                  placeholderTextColor={C.faint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!saving}
                />

                <FieldLabel>X (Twitter)</FieldLabel>
                <TextInput
                  style={styles.field}
                  value={editX}
                  onChangeText={setEditX}
                  placeholder="X Handle"
                  placeholderTextColor={C.faint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!saving}
                />
              </View>

              {/* Read-only info */}
              {displayEmail && (
                <View style={[styles.editSection, { opacity: 0.6 }]}>
                  <Text style={styles.editSectionTitle}>Account (read-only)</Text>
                  <FieldLabel>Email</FieldLabel>
                  <View style={[styles.field, { justifyContent: 'center', backgroundColor: C.mist }]}>
                    <Text style={{ fontSize: 14, color: C.slate }}>{displayEmail}</Text>
                  </View>
                </View>
              )}

            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* ── Banner ── */
  banner: {
    height: 150,
    backgroundColor: C.ink,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerMeta: {
    position: 'absolute',
    top: 16,
    left: 20,
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
  },
  signOutBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  signOutText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
  },

  /* ── Identity ── */
  editBtn: {
    height: 36,
    paddingHorizontal: 16,
    backgroundColor: C.red,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: {
    fontFamily: Fonts.serif,
    fontSize: 28,
    letterSpacing: -0.5,
    lineHeight: 30,
    marginBottom: 6,
    color: C.ink,
  },
  displayHeadline: {
    fontSize: 14,
    color: C.slate,
    lineHeight: 20,
    marginBottom: 12,
  },

  /* ── Meta chips ── */
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: C.mist,
    borderRadius: 20,
  },
  chipText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: C.slate,
    letterSpacing: 0.5,
  },

  /* ── Stats ── */
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.hair,
    paddingVertical: 16,
    marginBottom: 24,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    letterSpacing: -0.3,
    color: C.ink,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    backgroundColor: C.hair,
    marginVertical: 4,
  },

  /* ── Edit modal ── */
  editTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.hair,
  },
  editSection: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: C.hair,
  },
  editSectionTitle: {
    fontFamily: Fonts.serif,
    fontSize: 17,
    color: C.ink,
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  fieldLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: C.slate,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 14,
  },
  field: {
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: C.ink,
    backgroundColor: C.paper,
  },
  charCount: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: C.faint,
    textAlign: 'right',
    marginTop: 4,
  },
});
