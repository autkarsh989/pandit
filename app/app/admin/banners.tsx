import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Modal, TextInput, TouchableOpacity, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Screen from '@/components/Screen';
import Card from '@/components/Card';
import AppButton from '@/components/AppButton';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { ASSET_BASE_URL } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';

type Banner = {
  id: string;
  title: string;
  subtitle: string;
  badge_text?: string;
  image_url?: string;
  target_audience: 'user' | 'pandit' | 'both';
  is_active: boolean;
  created_at: string;
};

export default function BannersScreen() {
  const { token, userType, ready, signOut } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    badgeText: '',
    targetAudience: 'both' as 'user' | 'pandit' | 'both',
    isActive: true,
  });

  useEffect(() => {
    if (!ready) return;
    if (!token || userType !== 'admin') {
      router.replace('/(auth)/admin');
      return;
    }
    loadBanners();
  }, [ready, token, userType]);

  const loadBanners = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiGet<Banner[]>('/admin/banners', token);
      setBanners(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Load banners error', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const openCreateModal = () => {
    setEditing(null);
    setForm({
      title: '',
      subtitle: '',
      badgeText: '',
      targetAudience: 'both',
      isActive: true,
    });
    setSelectedImage(null);
    setShowModal(true);
  };

  const openEditModal = (banner: Banner) => {
    setEditing(banner);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle,
      badgeText: banner.badge_text || '',
      targetAudience: banner.target_audience,
      isActive: banner.is_active,
    });
    setSelectedImage(null);
    setShowModal(true);
  };

  const saveBanner = async () => {
    if (!token) return;
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('subtitle', form.subtitle);
      if (form.badgeText) formData.append('badge_text', form.badgeText);
      formData.append('target_audience', form.targetAudience);
      formData.append('is_active', form.isActive.toString());

      if (selectedImage) {
        formData.append('image', {
          uri: selectedImage,
          type: 'image/jpeg',
          name: 'banner.jpg',
        } as any);
      }

      if (editing) {
        await apiPut(`/admin/banners/${editing.id}`, formData, token);
      } else {
        await apiPost('/admin/banners', formData, token);
      }

      setShowModal(false);
      loadBanners();
    } catch (error) {
      console.error('Save banner error', error);
      Alert.alert('Error', 'Failed to save banner');
    }
  };

  const deleteBanner = async (bannerId: string) => {
    if (!token) return;
    Alert.alert(
      'Delete Banner',
      'Are you sure you want to delete this banner?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiDelete(`/admin/banners/${bannerId}`, token);
              loadBanners();
            } catch (error) {
              console.error('Delete banner error', error);
              Alert.alert('Error', 'Failed to delete banner');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/admin');
          },
        },
      ]
    );
  };

  const handleBack = () => {
    router.back();
  };

  const toggleBannerStatus = async (banner: Banner) => {
    if (!token) return;
    try {
      await apiPut(`/admin/banners/${banner.id}`, {
        ...banner,
        is_active: !banner.is_active,
      }, token);
      loadBanners();
    } catch (error) {
      console.error('Toggle banner status error', error);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Banner Management</Text>
        </View>
        <View style={styles.headerActions}>
          <AppButton title="Back" variant="secondary" onPress={handleBack} />
          <AppButton title="Logout" variant="secondary" onPress={handleLogout} />
          <AppButton title="Create Banner" onPress={openCreateModal} />
        </View>
      </View>

      {loading ? <Text style={styles.loading}>Loading banners...</Text> : null}

      <View style={styles.list}>
        {banners.map((banner) => (
          <Card key={banner.id} style={styles.bannerCard}>
            {banner.image_url && (
              <Image
                source={{ uri: `${ASSET_BASE_URL}${banner.image_url}` }}
                style={styles.bannerImage}
              />
            )}
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>{banner.title}</Text>
              <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
              {banner.badge_text && (
                <Text style={styles.bannerBadge}>{banner.badge_text}</Text>
              )}
              <View style={styles.bannerMeta}>
                <Text style={styles.metaText}>Target: {banner.target_audience}</Text>
                <Text style={[styles.metaText, { color: banner.is_active ? colors.orange600 : colors.ink500 }]}>
                  {banner.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
              <View style={styles.bannerActions}>
                <AppButton
                  title={banner.is_active ? 'Deactivate' : 'Activate'}
                  variant="secondary"
                  onPress={() => toggleBannerStatus(banner)}
                />
                <AppButton title="Edit" onPress={() => openEditModal(banner)} />
                <AppButton
                  title="Delete"
                  variant="secondary"
                  onPress={() => deleteBanner(banner.id)}
                />
              </View>
            </View>
          </Card>
        ))}
      </View>

      {banners.length === 0 && !loading && (
        <Card>
          <Text style={styles.emptyText}>No banners created yet.</Text>
          <AppButton title="Create First Banner" onPress={openCreateModal} />
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editing ? 'Edit Banner' : 'Create Banner'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Title"
              value={form.title}
              onChangeText={(text) => setForm(prev => ({ ...prev, title: text }))}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Subtitle"
              value={form.subtitle}
              onChangeText={(text) => setForm(prev => ({ ...prev, subtitle: text }))}
              multiline
            />

            <TextInput
              style={styles.input}
              placeholder="Badge Text (Optional)"
              value={form.badgeText}
              onChangeText={(text) => setForm(prev => ({ ...prev, badgeText: text }))}
            />

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Target Audience:</Text>
              <View style={styles.pickerRow}>
                {(['user', 'pandit', 'both'] as const).map((audience) => (
                  <TouchableOpacity
                    key={audience}
                    style={[
                      styles.pickerOption,
                      form.targetAudience === audience && styles.pickerOptionActive
                    ]}
                    onPress={() => setForm(prev => ({ ...prev, targetAudience: audience }))}
                  >
                    <Text style={[
                      styles.pickerText,
                      form.targetAudience === audience && styles.pickerTextActive
                    ]}>
                      {audience.charAt(0).toUpperCase() + audience.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Text style={styles.imageButtonText}>
                {selectedImage ? 'Change Image' : 'Select Image'}
              </Text>
            </TouchableOpacity>

            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            )}

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setForm(prev => ({ ...prev, isActive: !prev.isActive }))}
              >
                <Text style={styles.checkboxText}>
                  {form.isActive ? '✓' : ''} Active
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <AppButton title="Cancel" variant="secondary" onPress={() => setShowModal(false)} />
              <AppButton title="Save" onPress={saveBanner} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
    gap: 10,
  },
  titleSection: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.ink900,
  },
  loading: {
    textAlign: 'center',
    fontFamily: fonts.body,
    color: colors.ink500,
  },
  list: {
    gap: 12,
  },
  bannerCard: {
    gap: 10,
  },
  bannerImage: {
    width: '100%',
    height: 120,
    borderRadius: radius.md,
  },
  bannerContent: {
    gap: 6,
  },
  bannerTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.ink900,
  },
  bannerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink500,
  },
  bannerBadge: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    color: colors.orange600,
    textTransform: 'uppercase',
  },
  bannerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.ink500,
  },
  bannerActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  emptyText: {
    textAlign: 'center',
    fontFamily: fonts.body,
    color: colors.ink500,
    marginBottom: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(32, 22, 14, 0.55)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 12,
    maxHeight: '90%',
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border200,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.body,
    backgroundColor: '#fdfaf7',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    gap: 6,
  },
  pickerLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.ink700,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border200,
    alignItems: 'center',
  },
  pickerOptionActive: {
    backgroundColor: colors.orange600,
    borderColor: colors.orange600,
  },
  pickerText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.ink700,
  },
  pickerTextActive: {
    color: '#fff',
  },
  imageButton: {
    borderWidth: 1,
    borderColor: colors.border200,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  imageButtonText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.ink700,
  },
  previewImage: {
    width: '100%',
    height: 100,
    borderRadius: radius.md,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkboxText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.ink700,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
});