import React from 'react';
import {
    Modal, View, Text, StyleSheet, FlatList,
    TouchableOpacity, ActivityIndicator
} from 'react-native';
import { MaterialIcons, Ionicons } from "@expo/vector-icons";

const StockTransactionModal = ({ visible, onClose, data, isLoading, colors }) => {

    const TransactionCard = ({ item }) => (
        <View style={[styles.card, { backgroundColor: colors.backgroundWhite, borderLeftColor: item.outward > 0 ? colors.statusRed : colors.statusGreen }]}>

            {/* 1. Header: Movement Type & Reference */}
            <View style={styles.cardHeader}>
                <View style={[styles.typeBadge, { backgroundColor: item.outward > 0 ? colors.statusRed + '20' : colors.statusGreen + '20' }]}>
                    <Text allowFontScaling={false} style={[styles.typeText, { color: item.outward > 0 ? colors.statusRed : colors.statusGreen }]}>
                        {item.movement_type_name || 'Stock Update'}
                    </Text>
                </View>
                <Text allowFontScaling={false} style={styles.refNo}>Ref: {item.ref_no || '-'}</Text>
            </View>

            {/* 2. Product & Branch Section */}
            <View style={styles.infoSection}>
                <Text allowFontScaling={false} style={[styles.productName, { color: colors.primaryBlue }]}>
                    {item.product_name || 'Unknown Product'}
                </Text>
                <View style={styles.branchRow}>
                    <Ionicons name="business-outline" size={14} color="#666" />
                    <Text allowFontScaling={false} style={styles.branchText}>{item.branch_name || 'N/A'}</Text>
                </View>
            </View>

            {/* 3. Date & Time */}
            <View style={styles.dateTimeRow}>
                <Ionicons name="time-outline" size={12} color="#888" />
                <Text allowFontScaling={false} style={styles.dateText}>{item.txn_datetime}</Text>
            </View>

            <View style={styles.divider} />

            {/* 4. Metrics Grid */}
            <View style={styles.metricsContainer}>
                <MetricSection title="Opening" qty={item.opening_qty} rate={item.opening_rate} val={item.opening_value} color="#777" />
                <MetricSection
                    title={item.inward > 0 ? "Inward (+)" : "Outward (-)"}
                    qty={item.movement_qty}
                    rate={item.movement_rate}
                    val={item.movement_value}
                    color={item.outward > 0 ? colors.statusRed : colors.primaryBlue}
                    isBold
                />
                <MetricSection title="Closing" qty={item.closing_qty} rate={item.closing_rate} val={item.closing_value} color={colors.statusGreen} />
            </View>
        </View>
    );

    const MetricSection = ({ title, qty, rate, val, color, isBold }) => (
        <View style={styles.metricSection}>
            <Text allowFontScaling={false} style={[styles.sectionTitle, { color: color }]}>{title}</Text>
            <Text allowFontScaling={false} style={styles.metricText}>Qty: <Text allowFontScaling={false} style={[styles.bold, isBold && { color: color }]}>{qty}</Text></Text>
            <Text allowFontScaling={false} style={styles.metricText}>Rate: <Text allowFontScaling={false} style={styles.bold}>{rate}</Text></Text>
            <Text allowFontScaling={false} style={styles.metricText}>Val: <Text allowFontScaling={false} style={styles.bold}>{val}</Text></Text>
        </View>
    );

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContainer, { backgroundColor: colors.appScreenColor }]}>
                    <View style={[styles.header, { backgroundColor: colors.appThemeColor }]}>
                        <View>
                            <Text allowFontScaling={false} style={styles.headerTitle}>Stock Ledger Transactions</Text>
                            <Text allowFontScaling={false} style={styles.headerSubTitle}>Detailed Transaction History</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <MaterialIcons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <ActivityIndicator size="large" color={colors.appThemeColor} style={{ marginTop: 50 }} />
                    ) : (
                        <FlatList
                            data={data}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item }) => <TransactionCard item={item} />}
                            contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
                            ListEmptyComponent={<Text allowFontScaling={false} style={styles.emptyText}>No ledger entries found for this period.</Text>}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContainer: { height: '88%', borderTopLeftRadius: 25, borderTopRightRadius: 25, overflow: 'hidden' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
    headerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    headerSubTitle: { color: '#fff', fontSize: 10, opacity: 0.8 },
    card: { borderRadius: 12, padding: 15, marginBottom: 12, elevation: 3, borderLeftWidth: 5 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    typeText: { fontSize: 10, fontWeight: 'bold' },
    refNo: { fontSize: 11, fontWeight: '700', color: '#444' },
    infoSection: { marginBottom: 8 },
    productName: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
    branchRow: { flexDirection: 'row', alignItems: 'center' },
    branchText: { fontSize: 12, color: '#666', marginLeft: 5, fontWeight: '500' },
    dateTimeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    dateText: { fontSize: 10, color: '#888', marginLeft: 4 },
    divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 },
    metricsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    metricSection: { flex: 1 },
    sectionTitle: { fontSize: 9, fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' },
    metricText: { fontSize: 10, color: '#555' },
    bold: { fontWeight: '700', color: '#000' },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#999' }
});

export default StockTransactionModal;