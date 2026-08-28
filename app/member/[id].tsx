import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { C, Fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/tedx/avatar';
import { useApi } from '@/lib/hooks/use-api';
import { UsersApi } from '@/lib/api/users';

import { useTheme } from '@/lib/theme/context';

function inferRole(headline?: string, explicitRole?: string): 'Speaker' | 'Organizer' | 'Attendee' {
  if (explicitRole) {
    const r = explicitRole.toLowerCase();
    if (r === 'speaker') return 'Speaker';
    if (r === 'organizer' || r === 'admin' || r === 'super_admin' || r === 'curator') return 'Organizer';
    if (r === 'user' || r === 'attendee' || r === 'member') return 'Attendee';
  }
  const h = (headline || '').toLowerCase();
  if (h.includes('speaker')) return 'Speaker';
  if (h.includes('organizer') || h.includes('curator') || h.includes('host')) return 'Organizer';
  return 'Attendee';
}

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const { data: member, loading, error, refetch } = useApi(
    () => UsersApi.byId(id),
    [id]
  );

  const displayName = member?.fullName ?? '—';
  const displayEmail = member?.email ?? null;
  const displayHeadline = member?.headline ?? null;
  const displayBio = member?.bio ?? null;
  const displayLocation = member?.location ?? null;
  const displayWebsite = member?.website ?? null;
  const displayLinkedin = member?.linkedin ?? null;
  const displayWhatsapp = member?.whatsapp ?? null;
  const displayInstagram = member?.instagram ?? null;
  const displayX = member?.x ?? null;
  const avatarUrl = member?.avatarUrl ?? null;
  const joinedYear = member?.createdAt ? new Date(member.createdAt).getFullYear() : null;
  const postsCount = member?.postsCount ?? 0;
  
  const role = inferRole(displayHeadline || '', member?.role);

  const handleShare = async () => {
    if (!member) return;
    try {
      await Share.share({
        message: `Connect with ${displayName} on TEDxPune Community App!\n${displayHeadline ?? ''}`,
      });
    } catch { /* cancelled */ }
  };

  const handleSocialPress = (type: 'linkedin' | 'whatsapp' | 'instagram' | 'x', value: string) => {
    let url = '';
    const cleaned = value.trim();
    if (!cleaned) return;

    switch (type) {
      case 'linkedin':
        url = cleaned.startsWith('http') ? cleaned : `https://linkedin.com/in/${cleaned}`;
        break;
      case 'whatsapp':
        const phone = cleaned.replace(/[^\d+]/g, '');
        url = `https://wa.me/${phone}`;
        break;
      case 'instagram':
        const handleInsta = cleaned.startsWith('@') ? cleaned.slice(1) : cleaned;
        url = `https://instagram.com/${handleInsta}`;
        break;
      case 'x':
        const handleX = cleaned.startsWith('@') ? cleaned.slice(1) : cleaned;
        url = `https://x.com/${handleX}`;
        break;
    }

    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'User Profile',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginLeft: Platform.OS === 'ios' ? -8 : 0,
                paddingVertical: 8,
                paddingHorizontal: 4,
              }}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
              <Text style={{ fontSize: 17, color: colors.text, marginLeft: 2 }}>Directory</Text>
            </TouchableOpacity>
          ),
        }}
      />

      {loading && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.red} />
        </View>
      )}

      {error && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: C.red, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
            Error Loading Member
          </Text>
          <Text style={{ fontSize: 14, color: C.slate, textAlign: 'center', marginBottom: 20 }}>
            {error.message}
          </Text>
          <TouchableOpacity onPress={refetch} style={styles.retryBtn}>
            <Text style={{ color: C.paper, fontWeight: '600', fontSize: 13 }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && member && (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          
          {/* Asymmetric Profile Intro Card */}
          <View style={[styles.introCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.introLeft}>
              <View style={[styles.badge, { backgroundColor: isDark ? colors.card : C.mist, borderColor: colors.border }]}>
                <Text style={[styles.badgeText, { color: colors.subtext }]}>{role}</Text>
              </View>
              <Text style={[styles.memberName, { color: colors.text }]}>{displayName}</Text>
              {joinedYear && (
                <Text style={[styles.memberSince, { color: colors.subtext }]}>Member since {joinedYear}</Text>
              )}
            </View>
            <View style={styles.introRight}>
              <Avatar name={displayName} size={80} url={avatarUrl} ring />
            </View>
          </View>

          {/* Large Quote/Headline Block */}
          {displayHeadline ? (
            <View style={[styles.headlineContainer, { backgroundColor: colors.card, borderLeftColor: C.red }]}>
              <Text style={styles.quoteMark}>“</Text>
              <Text style={[styles.headlineText, { color: colors.subtext }]}>{displayHeadline}</Text>
            </View>
          ) : null}

          {/* Social Media Link Buttons */}
          {(displayLinkedin || displayWhatsapp || displayInstagram || displayX) ? (
            <View style={styles.socialButtonsRow}>
              {displayLinkedin && (
                <TouchableOpacity
                  style={[styles.socialPill, { borderColor: '#0077B5', backgroundColor: colors.surface }]}
                  onPress={() => handleSocialPress('linkedin', displayLinkedin)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.socialPillText, { color: '#0077B5' }]}>LinkedIn 💼</Text>
                </TouchableOpacity>
              )}
              {displayWhatsapp && (
                <TouchableOpacity
                  style={[styles.socialPill, { borderColor: '#25D366', backgroundColor: colors.surface }]}
                  onPress={() => handleSocialPress('whatsapp', displayWhatsapp)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.socialPillText, { color: '#25D366' }]}>WhatsApp 💬</Text>
                </TouchableOpacity>
              )}
              {displayInstagram && (
                <TouchableOpacity
                  style={[styles.socialPill, { borderColor: '#E1306C', backgroundColor: colors.surface }]}
                  onPress={() => handleSocialPress('instagram', displayInstagram)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.socialPillText, { color: '#E1306C' }]}>Instagram 📸</Text>
                </TouchableOpacity>
              )}
              {displayX && (
                <TouchableOpacity
                  style={[styles.socialPill, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={() => handleSocialPress('x', displayX)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.socialPillText, { color: colors.text }]}>𝕏 (Twitter) 𝕏</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {/* Stats Bar - As elegant pills */}
          <View style={styles.quickStatsRow}>
            <View style={[styles.statPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statPillValue, { color: colors.text }]}>{postsCount}</Text>
              <Text style={[styles.statPillLabel, { color: colors.subtext }]}>POSTS</Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statPillValue, { color: colors.text }]}>—</Text>
              <Text style={[styles.statPillLabel, { color: colors.subtext }]}>TALKS</Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statPillValue, { color: colors.text }]}>—</Text>
              <Text style={[styles.statPillLabel, { color: colors.subtext }]}>CONNECTS</Text>
            </View>
          </View>

          {/* About / Bio Card */}
          {displayBio ? (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderLine}>
                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>BIOGRAPHY</Text>
                <View style={[styles.accentLine, { backgroundColor: colors.border }]} />
              </View>
              <View style={[styles.bioCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.bioText, { color: colors.text }]}>{displayBio}</Text>
              </View>
            </View>
          ) : null}

          {/* Contact Details Grid */}
          {(displayEmail || displayLocation || displayWebsite) ? (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderLine}>
                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>DIRECTORY INFO</Text>
                <View style={[styles.accentLine, { backgroundColor: colors.border }]} />
              </View>
              
              <View style={[styles.detailsGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {displayLocation && (
                  <View style={[styles.detailsGridItem, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.gridItemLabel, { color: colors.subtext }]}>LOCATION</Text>
                    <Text style={[styles.gridItemValue, { color: colors.text }]}>📍 {displayLocation}</Text>
                  </View>
                )}

                {displayEmail && (
                  <View style={[styles.detailsGridItem, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.gridItemLabel, { color: colors.subtext }]}>EMAIL</Text>
                    <Text style={[styles.gridItemValue, { color: colors.text }]} numberOfLines={1}>✉️ {displayEmail}</Text>
                  </View>
                )}

                {displayWebsite && (
                  <View style={[styles.detailsGridItem, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.gridItemLabel, { color: colors.subtext }]}>WEBSITE</Text>
                    <Text style={[styles.gridItemValue, { color: C.red }]} numberOfLines={1}>🔗 {displayWebsite.replace(/^https?:\/\/(www\.)?/, '')}</Text>
                  </View>
                )}
              </View>
            </View>
          ) : null}

          {/* Action Button */}
          <TouchableOpacity style={[styles.primaryActionBtn, { backgroundColor: isDark ? C.red : C.ink }]} onPress={handleShare} activeOpacity={0.8}>
            <Text style={styles.primaryActionBtnText}>Share Profile</Text>
          </TouchableOpacity>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.hair,
    backgroundColor: C.paper,
  },
  circleBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: C.ink,
    fontWeight: '600',
  },
  headerLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.muted,
  },
  circleShareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIcon: {
    fontSize: 16,
    color: C.ink,
    marginTop: -2,
  },
  retryBtn: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    backgroundColor: C.red,
    borderRadius: 8,
  },

  /* Asymmetric Card */
  introCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: C.mist,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.hair,
  },
  introLeft: {
    flex: 1,
    marginRight: 16,
    alignItems: 'flex-start',
  },
  introRight: {
    alignSelf: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 8,
  },
  badgeText: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  memberName: {
    fontFamily: Fonts.serif,
    fontSize: 26,
    fontWeight: 'bold',
    color: C.ink,
    lineHeight: 32,
    marginBottom: 4,
  },
  memberSince: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: C.faint,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  /* Headline / Quote */
  headlineContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.paper,
    borderLeftWidth: 3,
    borderLeftColor: C.red,
    marginBottom: 24,
  },
  quoteMark: {
    fontFamily: Fonts.serif,
    fontSize: 32,
    color: C.red,
    lineHeight: 18,
    marginTop: -4,
  },
  headlineText: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontStyle: 'italic',
    color: C.slate,
    lineHeight: 22,
  },

  /* Quick Stats Row */
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 28,
  },
  statPill: {
    flex: 1,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statPillValue: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    fontWeight: 'bold',
    color: C.ink,
    marginBottom: 2,
  },
  statPillLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: C.faint,
    letterSpacing: 1,
  },

  /* Sections Layout */
  sectionContainer: {
    marginBottom: 26,
  },
  sectionHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 1.5,
  },
  accentLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.hair,
  },
  bioCard: {
    backgroundColor: C.paper,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.hair,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 22,
    color: C.ink,
  },

  /* Contact Details Grid */
  detailsGrid: {
    backgroundColor: C.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.hair,
    padding: 16,
    gap: 14,
  },
  detailsGridItem: {
    borderBottomWidth: 1,
    borderBottomColor: `${C.hair}60`,
    paddingBottom: 10,
  },
  gridItemLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: C.faint,
    letterSpacing: 1,
    marginBottom: 4,
  },
  gridItemValue: {
    fontSize: 13.5,
    color: C.slate,
  },

  /* Action Button */
  primaryActionBtn: {
    backgroundColor: C.ink,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  primaryActionBtnText: {
    color: C.paper,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  socialButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  socialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: C.paper,
  },
  socialPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
