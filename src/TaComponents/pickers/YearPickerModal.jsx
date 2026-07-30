import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Dimensions
} from 'react-native';

const { width } = Dimensions.get('window');

const YearPickerModal = ({ visible, onClose, onSelect, colors }) => {
    const currentYear = new Date().getFullYear();
    // Initialize decade start (e.g., 2026 becomes 2020)
    const [startDecade, setStartDecade] = useState(Math.floor(currentYear / 10) * 10);

    // Generate 12 years: 1 year before the decade, 10 years of the decade, 1 year after
    const years = Array.from({ length: 12 }, (_, i) => startDecade - 1 + i);

    const changeDecade = (direction) => {
        setStartDecade(prev => direction === 'next' ? prev + 10 : prev - 10);
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                activeOpacity={1}
                style={styles.modalOverlay}
                onPress={onClose}
            >
                <View
                    style={[styles.yearPickerContainer, { backgroundColor: colors.backgroundWhite }]}
                    onStartShouldSetResponder={() => true} // Prevents closing when clicking inside
                >
                    {/* Header with Navigation */}
                    <View style={styles.yearHeader}>
                        <TouchableOpacity onPress={() => changeDecade('prev')} style={styles.navBtn}>
                            <Text style={[styles.navArrow, { color: colors.textBlack }]}>«</Text>
                        </TouchableOpacity>

                        <View style={[styles.decadeDisplay, { backgroundColor: colors.backgroundGray }]}>
                            <Text style={[styles.decadeText, { color: colors.textBlack }]}>
                                {startDecade} - {startDecade + 9}
                            </Text>
                        </View>

                        <TouchableOpacity onPress={() => changeDecade('next')} style={styles.navBtn}>
                            <Text style={[styles.navArrow, { color: colors.textBlack }]}>»</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Year Grid */}
                    <View style={styles.gridContainer}>
                        {years.map((year, index) => {
                            // Style first and last years as "out of range" (grayed out)
                            const isOutDecade = index === 0 || index === 11;
                            return (
                                <TouchableOpacity
                                    key={year}
                                    style={styles.yearBox}
                                    onPress={() => {
                                        onSelect({ id: year.toString(), name: year.toString() });
                                        onClose();
                                    }}
                                >
                                    <Text style={[
                                        styles.yearText,
                                        { color: isOutDecade ? colors.textGray : colors.textBlack }
                                    ]}>
                                        {year}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                        <Text style={{ color: colors.statusRed, fontWeight: '600' }}>CANCEL</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    yearPickerContainer: {
        width: width * 0.8,
        padding: 20,
        borderRadius: 12,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
    },
    yearHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    navBtn: {
        padding: 10,
    },
    navArrow: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    decadeDisplay: {
        paddingVertical: 8,
        paddingHorizontal: 25,
        borderRadius: 6,
    },
    decadeText: {
        fontWeight: '700',
        fontSize: 17,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    yearBox: {
        width: '33.3%',
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    yearText: {
        fontSize: 18,
        fontWeight: '500',
    },
    cancelBtn: {
        marginTop: 15,
        alignSelf: 'flex-end',
        padding: 10,
    },
});

export default YearPickerModal;