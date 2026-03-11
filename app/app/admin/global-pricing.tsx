import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Modal, TextInput, TouchableOpacity, Alert } from 'react-native';
import Screen from '@/components/Screen';
import Card from '@/components/Card';
import AppButton from '@/components/AppButton';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';

type GlobalPricing = {
  id: string;
  discount_percentage: number;
  is_active: boolean;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export default function GlobalPricingScreen() {
  const { token, userType, ready, signOut } = useAuth();
  const [pricingConfigs, setPricingConfigs] = useState<GlobalPricing[]>([]);
  const [currentPricing, setCurrentPricing] = useState<GlobalPricing | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GlobalPricing | null>(null);
  const [form, setForm] = useState({
    discountPercentage: '',
    description: '',
    isActive: true,
  });

  useEffect(() => {
    if (!ready) return;
    if (!token || userType !== 'admin') {
      router.replace('/(auth)/admin');
      return;
    }
    loadPricingConfigs();
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

  const loadPricingConfigs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [allConfigs, current] = await Promise.all([
        apiGet<GlobalPricing[]>('/admin/global-pricing', token),
        apiGet<GlobalPricing | null>('/global-pricing/current', token),
      ]);
      setPricingConfigs(Array.isArray(allConfigs) ? allConfigs : []);
      setCurrentPricing(current);
    } catch (error) {
      console.error('Load pricing configs error', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditing(null);
    setForm({
      discountPercentage: '',
      description: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (config: GlobalPricing) => {
    setEditing(config);
    setForm({
      discountPercentage: config.discount_percentage.toString(),
      description: config.description || '',
      isActive: config.is_active,
    });
    setShowModal(true);
  };

  const savePricingConfig = async () => {
    if (!token) return;
    
    if (!form.discountPercentage) {
      Alert.alert('Error', 'Discount percentage is required');
      return;
    }

    const discountValue = parseFloat(form.discountPercentage);
    if (discountValue < 0 || discountValue > 100) {
      Alert.alert('Error', 'Discount percentage must be between 0 and 100');
      return;
    }

    try {
      const payload = {
        discount_percentage: discountValue,
        description: form.description || null,
        is_active: form.isActive,
      };

      if (editing) {
        await apiPut(`/admin/global-pricing/${editing.id}`, payload, token);
      } else {
        await apiPost('/admin/global-pricing', payload, token);
      }

      setShowModal(false);
      loadPricingConfigs();
    } catch (error) {
      console.error('Save pricing config error', error);
      Alert.alert('Error', 'Failed to save pricing configuration');
    }
  };

  const deletePricingConfig = async (configId: string) => {
    if (!token) return;
    Alert.alert(
      'Delete Pricing Configuration',
      'Are you sure you want to delete this pricing configuration?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiDelete(`/admin/global-pricing/${configId}`, token);
              loadPricingConfigs();
            } catch (error) {
              console.error('Delete pricing config error', error);
              Alert.alert('Error', 'Failed to delete pricing configuration');
            }
          },
        },
      ]
    );
  };

  const activatePricingConfig = async (configId: string) => {
    if (!token) return;
    try {
      await apiPost(`/admin/global-pricing/activate/${configId}`, {}, token);
      loadPricingConfigs();
    } catch (error) {
      console.error('Activate pricing config error', error);
      Alert.alert('Error', 'Failed to activate pricing configuration');
    }
  };

  const deactivateAllPricing = async () => {
    if (!token) return;
    Alert.alert(
      'Deactivate All Pricing',
      'This will return all services to their original prices. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate All',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiPost('/admin/global-pricing/deactivate-all', {}, token);
              loadPricingConfigs();
            } catch (error) {
              console.error('Deactivate all pricing error', error);
              Alert.alert('Error', 'Failed to deactivate pricing configurations');
            }
          },
        },
      ]
    );
  };

  const formatDiscount = (percentage: number) => {
    if (percentage === 0) return 'No Discount';
    return `${percentage}% OFF`;
  };

  const calculateDiscountedPrice = (originalPrice: number, discountPercentage: number) => {
    return originalPrice * (1 - discountPercentage / 100);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Global Pricing Management</Text>
        </View>
        <View style={styles.headerActions}>
          <AppButton title="Back" variant="secondary" onPress={handleBack} />
          <AppButton title="Logout" variant="secondary" onPress={handleLogout} />
          <AppButton title="Create Config" onPress={openCreateModal} />
        </View>
      </View>

      {/* Current Active Pricing */}
      <Card style={styles.currentCard}>
        <Text style={styles.currentTitle}>Current Active Pricing</Text>
        {currentPricing ? (
          <View style={styles.currentInfo}>
            <Text style={styles.currentDiscount}>
              {formatDiscount(currentPricing.discount_percentage)}
            </Text>
            <Text style={styles.currentDescription}>
              {currentPricing.description || 'Global pricing discount applied to all services'}
            </Text>
            <View style={styles.examplePricing}>
              <Text style={styles.exampleTitle}>Example Pricing:</Text>
              <Text style={styles.exampleText}>
                Rs 1000 → Rs {calculateDiscountedPrice(1000, currentPricing.discount_percentage).toFixed(0)}
              </Text>
              <Text style={styles.exampleText}>
                Rs 2500 → Rs {calculateDiscountedPrice(2500, currentPricing.discount_percentage).toFixed(0)}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noPricing}>No active pricing discount. All services at original prices.</Text>
        )}
        <AppButton
          title="Return to Original Prices"
          variant="secondary"
          onPress={deactivateAllPricing}
        />
      </Card>

      {loading ? <Text style={styles.loading}>Loading pricing configurations...</Text> : null}

      <View style={styles.list}>
        {pricingConfigs.map((config) => (
          <Card key={config.id} style={styles.configCard}>
            <View style={styles.configHeader}>
              <View style={styles.configInfo}>
                <Text style={styles.configDiscount}>
                  {formatDiscount(config.discount_percentage)}
                </Text>
                <Text style={styles.configDescription}>
                  {config.description || 'No description'}
                </Text>
                <Text style={styles.configDate}>
                  Created: {new Date(config.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.configStatus}>
                <Text style={[
                  styles.statusText,
                  { color: config.is_active ? colors.orange600 : colors.ink500 }
                ]}>
                  {config.is_active ? 'ACTIVE' : 'INACTIVE'}
                </Text>
              </View>
            </View>

            <View style={styles.configActions}>
              {!config.is_active && (
                <AppButton
                  title="Activate"
                  onPress={() => activatePricingConfig(config.id)}
                />
              )}
              <AppButton
                title="Edit"
                variant="secondary"
                onPress={() => openEditModal(config)}
              />
              <AppButton
                title="Delete"
                variant="secondary"
                onPress={() => deletePricingConfig(config.id)}
              />
            </View>
          </Card>
        ))}
      </View>

      {pricingConfigs.length === 0 && !loading && (
        <Card>
          <Text style={styles.emptyText}>No pricing configurations created yet.</Text>
          <AppButton title="Create First Configuration" onPress={openCreateModal} />
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editing ? 'Edit Pricing Configuration' : 'Create Pricing Configuration'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Discount Percentage (0-100) *"
              value={form.discountPercentage}
              onChangeText={(text) => setForm(prev => ({ ...prev, discountPercentage: text }))}
              keyboardType="numeric"
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (Optional)"
              value={form.description}
              onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
              multiline
            />

            {form.discountPercentage && (
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>Price Preview:</Text>
                <Text style={styles.previewText}>
                  Rs 1000 → Rs {calculateDiscountedPrice(1000, parseFloat(form.discountPercentage) || 0).toFixed(0)}
                </Text>
                <Text style={styles.previewText}>
                  Rs 2500 → Rs {calculateDiscountedPrice(2500, parseFloat(form.discountPercentage) || 0).toFixed(0)}
                </Text>
                <Text style={styles.previewText}>
                  Rs 5000 → Rs {calculateDiscountedPrice(5000, parseFloat(form.discountPercentage) || 0).toFixed(0)}
                </Text>
              </View>
            )}

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setForm(prev => ({ ...prev, isActive: !prev.isActive }))}
              >
                <Text style={styles.checkboxText}>
                  {form.isActive ? '✓' : ''} Activate Immediately
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <AppButton title="Cancel" variant="secondary" onPress={() => setShowModal(false)} />
              <AppButton title="Save" onPress={savePricingConfig} />
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
  currentCard: {
    backgroundColor: colors.orange500,
    marginBottom: spacing.lg,
  },
  currentTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  currentInfo: {
    gap: 6,
    marginBottom: 12,
  },
  currentDiscount: {
    fontFamily: fonts.headingBold,
    fontSize: 24,
    color: '#fff',
  },
  currentDescription: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  examplePricing: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.md,
    padding: 10,
    marginTop: 8,
  },
  exampleTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: '#fff',
    marginBottom: 4,
  },
  exampleText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
  },
  noPricing: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: '#fff',
    marginBottom: 12,
  },
  loading: {
    textAlign: 'center',
    fontFamily: fonts.body,
    color: colors.ink500,
  },
  list: {
    gap: 12,
  },
  configCard: {
    gap: 10,
  },
  configHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  configInfo: {
    flex: 1,
    gap: 4,
  },
  configDiscount: {
    fontFamily: fonts.bodySemi,
    fontSize: 18,
    color: colors.orange600,
  },
  configDescription: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink500,
  },
  configDate: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.ink500,
  },
  configStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 1,
  },
  configActions: {
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
  previewCard: {
    backgroundColor: '#f6eee4',
    borderRadius: radius.md,
    padding: 12,
    gap: 4,
  },
  previewTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.ink700,
    marginBottom: 4,
  },
  previewText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.ink600,
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