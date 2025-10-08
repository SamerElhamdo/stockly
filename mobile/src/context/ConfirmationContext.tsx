import React, { createContext, useCallback, useContext, useState } from 'react';
import { ConfirmationDialog, ConfirmationDialogProps } from '@/components/ConfirmationDialog';

interface ConfirmationContextValue {
  showConfirmation: (config: Omit<ConfirmationDialogProps, 'visible' | 'onConfirm' | 'onCancel'>) => Promise<boolean>;
  showDeleteConfirmation: (itemName: string) => Promise<boolean>;
  showLogoutConfirmation: () => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextValue | undefined>(undefined);

export const ConfirmationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<{
    visible: boolean;
    config: Omit<ConfirmationDialogProps, 'visible' | 'onConfirm' | 'onCancel'> | null;
    resolve: ((value: boolean) => void) | null;
  }>({
    visible: false,
    config: null,
    resolve: null,
  });

  const showConfirmation = useCallback((
    config: Omit<ConfirmationDialogProps, 'visible' | 'onConfirm' | 'onCancel'>
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        visible: true,
        config,
        resolve,
      });
    });
  }, []);

  const showDeleteConfirmation = useCallback((itemName: string): Promise<boolean> => {
    return showConfirmation({
      title: 'تأكيد الحذف',
      message: `هل أنت متأكد من حذف ${itemName}؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      type: 'danger',
    });
  }, [showConfirmation]);

  const showLogoutConfirmation = useCallback((): Promise<boolean> => {
    return showConfirmation({
      title: 'تأكيد تسجيل الخروج',
      message: 'هل أنت متأكد من تسجيل الخروج من الحساب؟',
      confirmText: 'تسجيل الخروج',
      cancelText: 'إلغاء',
      type: 'warning',
    });
  }, [showConfirmation]);

  const handleConfirm = useCallback(() => {
    if (dialog.resolve) {
      dialog.resolve(true);
    }
    setDialog({
      visible: false,
      config: null,
      resolve: null,
    });
  }, [dialog.resolve]);

  const handleCancel = useCallback(() => {
    if (dialog.resolve) {
      dialog.resolve(false);
    }
    setDialog({
      visible: false,
      config: null,
      resolve: null,
    });
  }, [dialog.resolve]);

  const value = {
    showConfirmation,
    showDeleteConfirmation,
    showLogoutConfirmation,
  };

  return (
    <ConfirmationContext.Provider value={value}>
      {children}
      {dialog.config && (
        <ConfirmationDialog
          visible={dialog.visible}
          {...dialog.config}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmationContext.Provider>
  );
};

export const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within ConfirmationProvider');
  }
  return context;
};
