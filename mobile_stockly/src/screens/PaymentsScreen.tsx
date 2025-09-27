import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Title, Paragraph, Appbar } from 'react-native-paper';

export default function PaymentsScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="صندوق المدفوعات" />
      </Appbar.Header>
      
      <View style={styles.content}>
        <Title>صندوق المدفوعات</Title>
        <Paragraph>هذه الصفحة قيد التطوير</Paragraph>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});