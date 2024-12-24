import { setStatusBarTranslucent } from 'expo-status-bar';
import {
    Modal as RNModal,
    KeyboardAvoidingView,
    View,
    Platform
} from 'react-native';
import React from 'react';

const CustomModal = ({ isOpen, withInput, children, ...rest }) => {
    const content = withInput ? (
        <KeyboardAvoidingView
            style={{
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                paddingHorizontal: 12,
                backgroundColor: 'rgba(74, 85, 104, 0.4)' // Tailwind bg-zinc-900/40 equivalent
            }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {children}
        </KeyboardAvoidingView>
    ) : (
        <View
            style={{
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                paddingHorizontal: 12,
                backgroundColor: 'rgba(74, 85, 104, 0.4)' // Tailwind bg-zinc-900/40 equivalent
            }}
        >
            {children}
        </View>
    );

    return (
        <RNModal
            visible={isOpen}
            transparent
            animationType='fade'
            statusBarTranslucent
            {...rest}
        >
            {content}
        </RNModal>
    );
};

export default CustomModal;
