import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, FlatList, Modal as RNModal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

export interface PickerOption {
  label: string;
  value: string | number;
}

interface PickerProps {
  label?: string;
  placeholder?: string;
  options: PickerOption[];
  value?: string | number;
  onChange: (value: string | number) => void;
  disabled?: boolean;
  searchable?: boolean;
}

export const Picker: React.FC<PickerProps> = ({
  label,
  placeholder = 'اختر...',
  options,
  value,
  onChange,
  disabled = false,
  searchable = false,
}) => {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption?.label || placeholder;

  const filteredOptions = searchable && searchQuery
    ? options.filter((opt) => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <>
      <View style={styles.container}>
        {label && <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text>}
        <TouchableOpacity
          style={[
            styles.pickerButton,
            { backgroundColor: theme.surface, borderColor: theme.border },
            disabled && { opacity: 0.5 },
          ]}
          onPress={() => !disabled && setModalVisible(true)}
          disabled={disabled}
        >
          <Ionicons name="chevron-down" size={20} color={theme.textMuted} />
          <Text
            style={[
              styles.pickerText,
              { color: selectedOption ? theme.textPrimary : theme.textMuted },
            ]}
          >
            {displayText}
          </Text>
        </TouchableOpacity>
      </View>

      <RNModal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModalVisible(false);
          setSearchQuery('');
        }}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: theme.surface,
            borderRadius: 20,
            padding: 20,
            width: '100%',
            maxWidth: 400,
            maxHeight: '70%',
          }}>
            <Text style={{ color: theme.textPrimary, fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
              {label || placeholder}
            </Text>
            
            <FlatList
          data={filteredOptions}
          keyExtractor={(item) => String(item.value)}
          renderItem={({ item }) => {
            const isSelected = item.value === value;
            return (
              <TouchableOpacity
                style={[
                  styles.optionItem,
                  { backgroundColor: isSelected ? theme.primary + '20' : 'transparent' },
                ]}
                onPress={() => handleSelect(item.value)}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={20} color={theme.primary} />
                )}
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: isSelected ? theme.primary : theme.textPrimary,
                      fontWeight: isSelected ? '600' : '400',
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: theme.border }]} />
          )}
            />
          </View>
        </View>
      </RNModal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pickerText: {
    fontSize: 15,
    flex: 1,
    textAlign: 'right',
    marginRight: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  optionText: {
    fontSize: 15,
    textAlign: 'right',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});

