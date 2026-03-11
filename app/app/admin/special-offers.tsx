import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Modal, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Screen from '@/components/Screen';
import Card from '@/components/Card';
import AppButton from '@/components/AppButton';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';

type SpecialOffer = {
  id: string;
  title: string;
  description: string;
  discount_percentage?: number;
  discount_amount?: number;
  offer_code?: string;
  target_audience: 'user' | 'pandit' | 'both';
  effect_type: 'badge' | 'flash' | 'glow' | 'pulse';
  effect_color: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  max_uses?: number;
  current_uses: number;
  created_at: string;
};

const EFFECT_TYPES = [
  { value: 'badge', label: 'Badge' },
  { value: 'flash', label: 'Flash' },
  { value: 'glow', label: 'Glow' },
  { value: 'pulse', label: 'Pulse' },
];

const EFFECT_COLORS = [
  '#ff6b35', '#ff3838', '#ff9500', '#ffcc02',
  '#32d74b', '#007aff', '#5856d6', '#af52de'
];

export default function SpecialOffersScreen() {
  const { token, userType, ready, signOut } = useAuth();
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SpecialOffer | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    discountPercentage: '',
    discountAmount: '',
    offerCode: '',
    targetAudience: 'both' as 'user' | 'pandit' | 'both',
    effectType: 'badge' as 'badge' | 'flash' | 'glow' | 'pulse',
    effectColor: '#ff6b35',
    endDate: null as Date | null,
    maxUses: '',
    isActive: true,
  });

  useEffect(() => {
    if (!ready) return;
    if (!token || userType !== 'admin') {
      router.replace('/(auth)/admin');
      return;
    }
    loadOffers();
  }, [ready, token, userType]);

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

  const loadOffers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      console.log('Loading special offers...');
      const data = await apiGet<SpecialOffer[]>('/admin/special-offers', token);
      console.log('Loaded special offers:', data);
      setOffers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Load offers error', error);
      Alert.alert('Error', `Failed to load special offers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditing(null);
    setForm({
      title: '',
      description: '',
      discountPercentage: '',
      discountAmount: '',
      offerCode: '',
      targetAudience: 'both',
      effectType: 'badge',
      effectColor: '#ff6b35',
      endDate: null,
      maxUses: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (offer: SpecialOffer) => {
    setEditing(offer);
    setForm({
      title: offer.title,
      description: offer.description,
      discountPercentage: offer.discount_percentage?.toString() || '',
      discountAmount: offer.discount_amount?.toString() || '',
      offerCode: offer.offer_code || '',
      targetAudience: offer.target_audience,
      effectType: offer.effect_type,
      effectColor: offer.effect_color,
      endDate: offer.end_date ? new Date(offer.end_date) : null,
      maxUses: offer.max_uses?.toString() || '',
      isActive: offer.is_active,
    });
    setShowModal(true);
  };

  const saveOffer = async () => {
    if (!token) return;
    
    if (!form.title || !form.description) {
      Alert.alert('Error', 'Title and description are required');
      return;
    }
    
    if (!form.discountPercentage && !form.discountAmount) {
      Alert.alert('Error', 'Either discount percentage or discount amount is required');
      return;
    }

    try {
      const payload = {
        title: form.title,
        description: form.description,
        discount_percentage: form.discountPercentage ? parseFloat(form.discountPercentage) : null,
        discount_amount: form.discountAmount ? parseFloat(form.discountAmount) : null,
        offer_code: form.offerCode || null,
        target_audience: form.targetAudience,
        effect_type: form.effectType,
        effect_color: form.effectColor,
        end_date: form.endDate ? form.endDate.toISOString() : null,
        max_uses: form.maxUses ? parseInt(form.maxUses) : null,
        is_active: form.isActive,
      };

      console.log('Saving special offer with payload:', payload);

      if (editing) {
        await apiPut(`/admin/special-offers/${editing.id}`, payload, token);
      } else {
        await apiPost('/admin/special-offers', payload, token);
      }

      setShowModal(false);
      loadOffers();
      Alert.alert('Success', `Special offer ${editing ? 'updated' : 'created'} successfully!`);
    } catch (error) {
      console.error('Save offer error', error);
      Alert.alert('Error', `Failed to save special offer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const deleteOffer = async (offerId: string) => {
    if (!token) return;
    Alert.alert(
      'Delete Special Offer',
      'Are you sure you want to delete this special offer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiDelete(`/admin/special-offers/${offerId}`, token);
              loadOffers();
            } catch (error) {
              console.error('Delete offer error', error);
              Alert.alert('Error', 'Failed to delete special offer');
            }
          },
        },
      ]
    );
  };

  const toggleOfferStatus = async (offer: SpecialOffer) => {
    if (!token) return;
    try {
      await apiPut(`/admin/special-offers/${offer.id}`, {
        ...offer,
        is_active: !offer.is_active,
      }, token);
      loadOffers();
    } catch (error) {
      console.error('Toggle offer status error', error);
    }
  };

  const formatDiscount = (offer: SpecialOffer) => {
    if (offer.discount_percentage) {
      return `${offer.discount_percentage}% OFF`;
    }
    if (offer.discount_amount) {
      return `Rs ${offer.discount_amount} OFF`;
    }
    return 'Special Offer';
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Special Offers Management</Text>
        </View>
        <View style={styles.headerActions}>
          <AppButton title="Back" variant="secondary" onPress={handleBack} />
          <AppButton title="Logout" variant="secondary" onPress={handleLogout} />
          <AppButton title="Create" onPress={openCreateModal} />
        </View>
      </View>

      {loading ? <Text style={styles.loading}>Loading offers...</Text> : null}

      <ScrollView style={styles.list}>
        {offers.map((offer) => (
          <Card key={offer.id} style={styles.offerCard}>
            <View style={styles.offerHeader}>
              <View style={[styles.effectPreview, { backgroundColor: offer.effect_color }]}>
                <Text style={styles.effectText}>{formatDiscount(offer)}</Text>
              </View>
              <View style={styles.offerInfo}>
                <Text style={styles.offerTitle}>{offer.title}</Text>
                <Text style={styles.offerDescription}>{offer.description}</Text>
              </View>
            </View>
            
            <View style={styles.offerMeta}>
              <Text style={styles.metaText}>Target: {offer.target_audience}</Text>
              <Text style={styles.metaText}>Effect: {offer.effect_type}</Text>
              <Text style={[styles.metaText, { color: offer.is_active ? colors.orange600 : colors.ink500 }]}>
                {offer.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>

            {offer.offer_code && (
              <Text style={styles.offerCode}>Code: {offer.offer_code}</Text>
            )}

            {offer.max_uses && (
              <Text style={styles.usageText}>
                Used: {offer.current_uses}/{offer.max_uses}
              </Text>
            )}

            {offer.end_date && (
              <Text style={styles.endDate}>
                Expires: {new Date(offer.end_date).toLocaleDateString()}
              </Text>
            )}

            <View style={styles.offerActions}>
              <AppButton
                title={offer.is_active ? 'Deactivate' : 'Activate'}
                variant="secondary"
                onPress={() => toggleOfferStatus(offer)}
              />
              <AppButton title="Edit" onPress={() => openEditModal(offer)} />
              <AppButton
                title="Delete"
                variant="secondary"
                onPress={() => deleteOffer(offer.id)}
              />
            </View>
          </Card>
        ))}
      </ScrollView>

      {offers.length === 0 && !loading && (
        <Card>
          <Text style={styles.emptyText}>No special offers created yet.</Text>
          <AppButton title="Create First Offer" onPress={openCreateModal} />
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <ScrollView style={styles.modalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {editing ? 'Edit Special Offer' : 'Create Special Offer'}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Title *"
                value={form.title}
                onChangeText={(text) => setForm(prev => ({ ...prev, title: text }))}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description *"
                value={form.description}
                onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
                multiline
              />

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Discount % (e.g., 20)"
                  value={form.discountPercentage}
                  onChangeText={(text) => setForm(prev => ({ ...prev, discountPercentage: text }))}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Discount Amount (Rs)"
                  value={form.discountAmount}
                  onChangeText={(text) => setForm(prev => ({ ...prev, discountAmount: text }))}
                  keyboardType="numeric"
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder="Offer Code (Optional)"
                value={form.offerCode}
                onChangeText={(text) => setForm(prev => ({ ...prev, offerCode: text }))}
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

              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Effect Type:</Text>
                <View style={styles.pickerRow}>
                  {EFFECT_TYPES.map((effect) => (
                    <TouchableOpacity
                      key={effect.value}
                      style={[
                        styles.pickerOption,
                        form.effectType === effect.value && styles.pickerOptionActive
                      ]}
                      onPress={() => setForm(prev => ({ ...prev, effectType: effect.value as any }))}
                    >
                      <Text style={[
                        styles.pickerText,
                        form.effectType === effect.value && styles.pickerTextActive
                      ]}>
                        {effect.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Effect Color:</Text>
                <View style={styles.colorRow}>
                  {EFFECT_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        form.effectColor === color && styles.colorOptionActive
                      ]}
                      onPress={() => setForm(prev => ({ ...prev, effectColor: color }))}
                    />
                  ))}
                </View>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Max Uses (Optional)"
                value={form.maxUses}
                onChangeText={(text) => setForm(prev => ({ ...prev, maxUses: text }))}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker('end')}
              >
                <Text style={styles.dateButtonText}>
                  {form.endDate ? `End Date: ${form.endDate.toLocaleDateString()}` : 'Set End Date (Optional)'}
                </Text>
              </TouchableOpacity>

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
                <AppButton title="Save" onPress={saveOffer} />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={form.endDate || new Date()}
          mode="date"
          display="default"
          onChange={(event: any, selectedDate?: Date) => {
            setShowDatePicker(null);
            if (selectedDate) {
              setForm(prev => ({ ...prev, endDate: selectedDate }));
            }
          }}
        />
      )}
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
    flex: 1,
  },
  offerCard: {
    gap: 10,
    marginBottom: 12,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  effectPreview: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  effectText: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    color: '#fff',
    textAlign: 'center',
  },
  offerInfo: {
    flex: 1,
  },
  offerTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.ink900,
  },
  offerDescription: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink500,
  },
  offerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.ink500,
  },
  offerCode: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.orange600,
  },
  usageText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.ink700,
  },
  endDate: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.ink500,
  },
  offerActions: {
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
  },
  modalScroll: {
    flex: 1,
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 12,
    marginTop: 50,
    marginBottom: 50,
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
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
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
    flexWrap: 'wrap',
  },
  pickerOption: {
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
  colorRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionActive: {
    borderColor: colors.ink900,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: colors.border200,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
  },
  dateButtonText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink700,
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