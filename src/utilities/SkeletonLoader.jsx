import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

// ── Shimmer primitive ─────────────────────────────────────────────────────────
const ShimmerBox = ({ width, height, style, colors, borderRadius = 6 }) => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

    return (
        <Animated.View
            style={[
                { width, height, borderRadius, backgroundColor: colors.dividerGray || '#E5E7EB' },
                { opacity },
                style,
            ]}
        />
    );
};

// ── Report Card Skeleton ──────────────────────────────────────────────────────
export const ReportCardSkeleton = ({ colors }) => (
    <View style={[skStyles.card, { backgroundColor: colors.backgroundWhite || colors.cardBackground }]}>
        {/* Top accent strip */}
        <ShimmerBox width="100%" height={4} borderRadius={0} colors={colors} />

        <View style={skStyles.body}>
            {/* Title row */}
            <View style={skStyles.titleRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                    <ShimmerBox width="72%" height={14} colors={colors} style={{ marginBottom: 8 }} />
                    <ShimmerBox width="36%" height={22} borderRadius={4} colors={colors} />
                </View>
                {/* Qty bubble */}
                <ShimmerBox width={68} height={56} borderRadius={10} colors={colors} />
            </View>

            {/* Branch row */}
            <View style={[skStyles.branchRow, { borderBottomColor: colors.dividerGray }]}>
                <ShimmerBox width={11} height={11} borderRadius={6} colors={colors} style={{ marginRight: 6 }} />
                <ShimmerBox width="50%" height={10} colors={colors} />
            </View>

            {/* Metrics row */}
            <View style={skStyles.metricsRow}>
                {[0, 1, 2].map((i) => (
                    <React.Fragment key={i}>
                        <View style={skStyles.metricCell}>
                            <ShimmerBox width="55%" height={9} colors={colors} style={{ marginBottom: 5 }} />
                            <ShimmerBox width="40%" height={13} colors={colors} />
                        </View>
                        {i < 2 && <View style={[skStyles.metricDivider, { backgroundColor: colors.dividerGray }]} />}
                    </React.Fragment>
                ))}
            </View>
        </View>
    </View>
);

// ── Stock Register Group Skeleton ─────────────────────────────────────────────
export const RegisterGroupSkeleton = ({ colors }) => (
    <View style={[skStyles.card, { backgroundColor: colors.backgroundWhite || colors.cardBackground }]}>
        {/* Group header */}
        <View style={[skStyles.groupHeader, { backgroundColor: colors.dividerGray + '80' }]}>
            <ShimmerBox width={13} height={13} borderRadius={7} colors={colors} style={{ marginRight: 6 }} />
            <ShimmerBox width="42%" height={12} borderRadius={4} colors={colors} />
            <View style={{ flex: 1 }} />
            <ShimmerBox width="26%" height={12} borderRadius={4} colors={colors} />
        </View>

        {/* Row */}
        <View style={[skStyles.registerRow, { borderTopColor: colors.dividerGray }]}>
            <View style={{ flex: 1, paddingRight: 10 }}>
                <ShimmerBox width="72%" height={22} borderRadius={4} colors={colors} style={{ marginBottom: 10 }} />
                <ShimmerBox width="55%" height={11} colors={colors} style={{ marginBottom: 8 }} />
                <ShimmerBox width="44%" height={10} colors={colors} style={{ marginBottom: 5 }} />
                <ShimmerBox width="48%" height={10} colors={colors} />
            </View>
            <View style={[skStyles.verticalDivider, { backgroundColor: colors.dividerGray }]} />
            <View style={{ flex: 1, paddingLeft: 10 }}>
                <ShimmerBox width="88%" height={22} borderRadius={4} colors={colors} style={{ marginBottom: 10 }} />
                <ShimmerBox width="45%" height={11} colors={colors} style={{ marginBottom: 8 }} />
                <ShimmerBox width="36%" height={10} colors={colors} style={{ marginBottom: 5 }} />
                <ShimmerBox width="50%" height={10} colors={colors} />
            </View>
        </View>

        {/* Balance bar */}
        <View style={[skStyles.balanceBar, { borderTopColor: colors.dividerGray, backgroundColor: colors.dividerGray + '25' }]}>
            <ShimmerBox width="30%" height={11} colors={colors} />
            <ShimmerBox width="18%" height={16} colors={colors} />
        </View>
    </View>
);

// ── Full screen skeleton (shows 3 report cards or 2 register groups) ──────────
export const ReportScreenSkeleton = ({ tab = 'Report', colors }) => {
    if (tab === 'Report') {
        return (
            <>
                {[1, 0.75, 0.5].map((opacity, i) => (
                    <View key={i} style={{ opacity }}>
                        <ReportCardSkeleton colors={colors} />
                    </View>
                ))}
            </>
        );
    }
    return (
        <>
            {[1, 0.65].map((opacity, i) => (
                <View key={i} style={{ opacity }}>
                    <RegisterGroupSkeleton colors={colors} />
                </View>
            ))}
        </>
    );
};

const skStyles = StyleSheet.create({
    card: {
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
    },
    body: { padding: 14 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    branchRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10, marginBottom: 10, borderBottomWidth: 1 },
    metricsRow: { flexDirection: 'row' },
    metricCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
    metricDivider: { width: 1, marginVertical: 4 },
    groupHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
    registerRow: { flexDirection: 'row', padding: 14, borderTopWidth: 1 },
    verticalDivider: { width: 1, marginHorizontal: 10 },
    balanceBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
});
