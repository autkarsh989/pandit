import { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, View, Image, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Screen from '@/components/Screen';
import Card from '@/components/Card';
import AppButton from '@/components/AppButton';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { ASSET_BASE_URL } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';

const QUICK_SERVICES = [
  { name: 'Satyanarayan Puja', category: 'Puja', price: 2100, duration: 180 },
  { name: 'Griha Pravesh Puja', category: 'Puja', price: 3500, duration: 240 },
  { name: 'Ganesh Chaturthi Puja', category: 'Festival', price: 2500, duration: 120 },
  { name: 'Navratri Hawan', category: 'Hawan', price: 5100, duration: 300 },
  { name: 'Vivah Sanskar', category: 'Wedding', price: 11000, duration: 480 },
  { name: 'Namkaran Ceremony', category: 'Naming', price: 2100, duration: 90 },
  { name: 'Kundli Reading', category: 'Astrology', price: 1100, duration: 60 },
  { name: 'Rudrabhishek', category: 'Puja', price: 3100, duration: 150 },
  { name: 'Lakshmi Puja', category: 'Puja', price: 2100, duration: 120 },
  { name: 'Durga Puja', category: 'Festival', price: 5100, duration: 240 },
  { name: 'Shradh Ceremony', category: 'Ritual', price: 3500, duration: 180 },
  { name: 'Vastu Consultation', category: 'Astrology', price: 2100, duration: 90 },
];

type Service = {
  id: string;
  name: string;
  category: string;
  description?: string;
  image_url?: string;
  base_price: number;
  duration_minutes: number;
};

type ServiceMeta = {
  total: number;
  skip: number;
  limit: number;
};

export default function ManageServicesScreen() {
  const { token, userType, ready } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [serviceMeta, setServiceMeta] = useState<ServiceMeta>({ total: 0, skip: 0, limit: 8 });
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState({
    name: '',
    category: '',
    basePrice: '',
    durationMinutes: '',
    description: '',
  });
  const [editForm, setEditForm] = useState(form);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    if (userType !== 'pandit') {
      router.replace('/(tabs)/dashboard');
      return;
    }
    loadServices();
  }, [ready, token, userType]);

  const categories = useMemo(
    () => ['Puja', 'Hawan', 'Wedding', 'Naming', 'Astrology', 'Festival', 'Ritual', 'Other'],
    []
  );

  const loadServices = async (skipOverride?: number) => {
    if (!token) return;
    setLoading(true);
    try {
      const skipValue = skipOverride !== undefined ? skipOverride : serviceMeta.skip;
      const data = await apiGet<any>(`/pandit/services/paged?skip=${skipValue}&limit=${serviceMeta.limit}`, token);
      
      setServiceMeta({
        total: data.total || 0,
        skip: data.skip || 0,
        limit: data.limit || serviceMeta.limit,
      });
      
      if (skipValue > 0) {
        setServices(prev => [...prev, ...(Array.isArray(data.items) ? data.items : [])]);
      } else {
        setServices(Array.isArray(data.items) ? data.items : []);
      }
    } catch (error) {
      console.error('Load services error', error);
    } finally {
      setLoading(false);
    }
  };

  const addService = async (payload: any) => {
    if (!token) return;
    try {
      await apiPost('/pandit/services', payload, token);
      setForm({ name: '', category: '', basePrice: '', durationMinutes: '', description: '' });
      setServiceMeta(prev => ({ ...prev, skip: 0 }));
      loadServices(0);
    } catch (error) {
      console.error('Add service error', error);
      Alert.alert('Error', 'Failed to add service');
    }
  };

  const handleAdd = () => {
    if (!form.name || !form.category || !form.basePrice || !form.durationMinutes) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    addService({
      name: form.name,
      category: form.category,
      description: form.description || null,
      base_price: parseFloat(form.basePrice),
      duration_minutes: parseInt(form.durationMinutes, 10),
    });
  };

  const openEdit = (service: Service) => {
    setEditing(service);
    setEditForm({
      name: service.name,
      category: service.category,
      description: service.description || '',
      basePrice: service.base_price.toString(),
      durationMinutes: service.duration_minutes.toString(),
    });
  };

  const updateService = async () => {
    if (!token || !editing) return;
    try {
      await apiPut(
        `/pandit/services/${editing.id}`,
        {
          name: editForm.name,
          category: editForm.category,
          description: editForm.description || null,
          base_price: parseFloat(editForm.basePrice),
          duration_minutes: parseInt(editForm.durationMinutes, 10),
        },
        token
      );
      setEditing(null);
      setServiceMeta(prev => ({ ...prev, skip: 0 }));
      loadServices(0);
    } catch (error) {
      console.error('Update service error', error);
      Alert.alert('Error', 'Failed to update service');
    }
  };

  const uploadServiceImage = async (serviceId: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (result.canceled) return;

      setUploadingImage(serviceId);
      
      const formData = new FormData();
      formData.append('file', {
        uri: result.assets[0].uri,
        type: 'image/jpeg',
        name: 'service.jpg',
      } as any);

      const response = await fetch(`${ASSET_BASE_URL.replace('/uploads', '')}/pandit/services/${serviceId}/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setServices(prev => 
          prev.map(service => 
            service.id === serviceId 
              ? { ...service, image_url: data.image_url }
              : service
          )
        );
        Alert.alert('Success', 'Image uploaded successfully!');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload image error', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploadingImage(null);
    }
  };

  const loadMoreServices = () => {
    const nextSkip = serviceMeta.skip + serviceMeta.limit;
    setServiceMeta(prev => ({ ...prev, skip: nextSkip }));
    loadServices(nextSkip);
  };

  return (
    <Screen>
      <Text style={styles.pageTitle}>Manage Services</Text>
      <Text style={styles.pageSubtitle}>Add and manage spiritual services offered on the platform.</Text>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Add New Service</Text>
        <TextInput
          style={styles.input}
          placeholder="Service Name *"
          value={form.name}
          onChangeText={(text) => setForm((prev) => ({ ...prev, name: text }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Category *"
          value={form.category}
          onChangeText={(text) => setForm((prev) => ({ ...prev, category: text }))}
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Base Price (Rs) *"
            value={form.basePrice}
            onChangeText={(text) => setForm((prev) => ({ ...prev, basePrice: text }))}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Duration (min) *"
            value={form.durationMinutes}
            onChangeText={(text) => setForm((prev) => ({ ...prev, durationMinutes: text }))}
            keyboardType="numeric"
          />
        </View>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description (Optional)"
          value={form.description}
          onChangeText={(text) => setForm((prev) => ({ ...prev, description: text }))}
          multiline
        />
        <AppButton title="Create Service" onPress={handleAdd} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Quick Add Services</Text>
        <Text style={styles.cardSub}>Tap to quickly add common services</Text>
        <View style={styles.quickGrid}>
          {QUICK_SERVICES.map((service) => (
            <TouchableOpacity
              key={service.name}
              style={styles.quickButton}
              onPress={() =>
                addService({
                  name: service.name,
                  category: service.category,
                  description: null,
                  base_price: service.price,
                  duration_minutes: service.duration,
                })
              }
            >
              <Text style={styles.quickButtonText}>{service.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.cardTitle}>Your Active Services</Text>
            <Text style={styles.cardSub}>Manage the services you currently offer</Text>
          </View>
          <AppButton title="Refresh" variant="secondary" onPress={() => loadServices(0)} />
        </View>
        
        {loading ? <Text style={styles.loading}>Loading services...</Text> : null}
        {!loading && services.length === 0 ? (
          <Text style={styles.loading}>No services found. Add some services above!</Text>
        ) : null}
        
        <View style={styles.list}>
          {services.map((service) => (
            <Card key={service.id} style={styles.serviceCard}>
              {service.image_url && (
                <Image
                  source={{ uri: `${ASSET_BASE_URL}${service.image_url}` }}
                  style={styles.serviceImage}
                />
              )}
              <View style={styles.serviceContent}>
                <Text style={styles.serviceTitle}>{service.name}</Text>
                <Text style={styles.serviceSub}>Category: {service.category}</Text>
                {service.description ? (
                  <Text style={styles.serviceSub}>{service.description}</Text>
                ) : null}
                <Text style={styles.serviceMeta}>
                  {service.duration_minutes} min • Rs {service.base_price}
                </Text>
                <View style={styles.serviceActions}>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={() => uploadServiceImage(service.id)}
                    disabled={uploadingImage === service.id}
                  >
                    <Text style={styles.uploadButtonText}>
                      {uploadingImage === service.id ? 'Uploading...' : 'Upload Image'}
                    </Text>
                  </TouchableOpacity>
                  <AppButton title="Edit" variant="secondary" onPress={() => openEdit(service)} />
                </View>
              </View>
            </Card>
          ))}
        </View>

        {services.length < serviceMeta.total && (
          <AppButton
            title="Load More Services"
            variant="secondary"
            onPress={loadMoreServices}
          />
        )}
      </Card>

      <Modal visible={!!editing} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Service</Text>
            <TextInput
              style={styles.input}
              placeholder="Service Name"
              value={editForm.name}
              onChangeText={(text) => setEditForm((prev) => ({ ...prev, name: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Category"
              value={editForm.category}
              onChangeText={(text) => setEditForm((prev) => ({ ...prev, category: text }))}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              value={editForm.description}
              onChangeText={(text) => setEditForm((prev) => ({ ...prev, description: text }))}
              multiline
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Base Price"
                value={editForm.basePrice}
                onChangeText={(text) => setEditForm((prev) => ({ ...prev, basePrice: text }))}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Duration (minutes)"
                value={editForm.durationMinutes}
                onChangeText={(text) => setEditForm((prev) => ({ ...prev, durationMinutes: text }))}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.modalActions}>
              <AppButton title="Cancel" variant="secondary" onPress={() => setEditing(null)} />
              <AppButton title="Save Changes" onPress={updateService} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.ink900,
  },
  pageSubtitle: {
    fontFamily: fonts.body,
    color: colors.ink500,
    marginBottom: spacing.md,
  },
  card: {
    marginBottom: spacing.lg,
    gap: 10,
  },
  cardTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink900,
  },
  cardSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink500,
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
    height: 90,
    textAlignVertical: 'top',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickButton: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: colors.border200,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickButtonText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.ink700,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  loading: {
    textAlign: 'center',
    fontFamily: fonts.body,
    color: colors.ink500,
  },
  list: {
    gap: 12,
  },
  serviceCard: {
    gap: 8,
  },
  serviceImage: {
    width: '100%',
    height: 120,
    borderRadius: radius.md,
  },
  serviceContent: {
    gap: 4,
  },
  serviceTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink900,
  },
  serviceSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink500,
  },
  serviceMeta: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.orange600,
  },
  serviceActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  uploadButton: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: colors.border200,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  uploadButtonText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.ink700,
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
    gap: 10,
    maxHeight: '90%',
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
});
