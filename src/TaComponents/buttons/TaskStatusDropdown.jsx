import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
} from "react-native";
import { useGetCommonDropDownQuery } from "../services/api"; // adjust path

// ─── Component ────────────────────────────────────────────────────────────────
export default function SearchableDropdown({
  action = "",
  placeholder = "Select...",
  label = "",
  onSelect,
  value = null,
}) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [allOptions, setAllOptions] = useState([]);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Debounce search input
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      setAllOptions([]);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const { data, isFetching } = useGetCommonDropDownQuery(
    { page, action, text: debouncedSearch },
    { skip: !visible }
  );

  useEffect(() => {
    if (data) {
      setAllOptions((prev) =>
        page === 1 ? data : [...prev, ...data]
      );
    }
  }, [data]);

  // Animate modal open
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 120,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.95);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleOpen = () => {
    setSearch("");
    setPage(1);
    setAllOptions([]);
    setVisible(true);
  };

  const handleSelect = (item) => {
    onSelect?.(item);
    setVisible(false);
  };

  const handleClear = () => {
    onSelect?.(null);
  };

  const loadMore = () => {
    if (!isFetching && data?.length > 0) {
      setPage((p) => p + 1);
    }
  };

  return (
    <View style={styles.container}>
      {!!label && <Text allowFontScaling={false} style={styles.label}>{label}</Text>}

      {/* Trigger Button */}
      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.8}
        style={[styles.trigger, visible && styles.triggerFocused]}
      >
        <Text allowFontScaling={false} style={value ? styles.triggerValue : styles.triggerPlaceholder}>
          {value?.text ?? placeholder}
        </Text>
        <View style={styles.triggerRight}>
          {value && (
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn} hitSlop={8}>
              <Text allowFontScaling={false} style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
          <Text allowFontScaling={false} style={[styles.chevron, visible && styles.chevronUp]}>⌄</Text>
        </View>
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)} />

        <Animated.View
          style={[
            styles.sheet,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text allowFontScaling={false} style={styles.sheetTitle}>{label || "Select Option"}</Text>
            <TouchableOpacity onPress={() => setVisible(false)} hitSlop={10}>
              <Text allowFontScaling={false} style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchWrap}>
            <Text allowFontScaling={false} style={styles.searchIcon}>🔍</Text>
            <TextInput allowFontScaling={false}
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={setSearch}
              autoFocus
              returnKeyType="search"
            />
            {isFetching && page === 1 && (
              <ActivityIndicator size="small" color="#4361ee" />
            )}
          </View>

          {/* List */}
          <FlatList
            data={allOptions}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelect(item)}
                style={[
                  styles.option,
                  value?.id === item.id && styles.optionSelected,
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.optionInner}>
                  <View style={styles.optionBadge}>
                    <Text allowFontScaling={false} style={styles.optionBadgeText}>#{item.id}</Text>
                  </View>
                  <Text allowFontScaling={false}
                    style={[
                      styles.optionText,
                      value?.id === item.id && styles.optionTextSelected,
                    ]}
                  >
                    {item.text}
                  </Text>
                </View>
                {value?.id === item.id && (
                  <Text allowFontScaling={false} style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={
              !isFetching ? (
                <View style={styles.emptyWrap}>
                  <Text allowFontScaling={false} style={styles.emptyText}>No results found</Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              isFetching && page > 1 ? (
                <ActivityIndicator
                  size="small"
                  color="#4361ee"
                  style={{ paddingVertical: 12 }}
                />
              ) : null
            }
            style={styles.list}
            contentContainerStyle={allOptions.length === 0 && styles.listEmpty}
          />
        </Animated.View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#444",
    marginBottom: 6,
    letterSpacing: 0.3,
  },

  // Trigger
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  triggerFocused: {
    borderColor: "#4361ee",
    borderWidth: 1.5,
  },
  triggerValue: {
    fontSize: 15,
    color: "#1a1a2e",
    fontWeight: "500",
    flex: 1,
  },
  triggerPlaceholder: {
    fontSize: 15,
    color: "#aaa",
    flex: 1,
  },
  triggerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  clearBtn: {
    padding: 2,
  },
  clearText: {
    fontSize: 13,
    color: "#999",
  },
  chevron: {
    fontSize: 18,
    color: "#666",
    lineHeight: 20,
    transform: [{ rotate: "0deg" }],
  },
  chevronUp: {
    transform: [{ rotate: "180deg" }],
  },

  // Backdrop
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  // Bottom Sheet
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: Platform.OS === "ios" ? 30 : 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: { elevation: 12 },
    }),
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  closeBtn: {
    fontSize: 16,
    color: "#888",
    padding: 2,
  },

  // Search
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    margin: 14,
    backgroundColor: "#f5f6fa",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1a1a2e",
    padding: 0,
  },

  // List
  list: {
    paddingHorizontal: 14,
  },
  listEmpty: {
    flexGrow: 1,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: "transparent",
  },
  optionSelected: {
    backgroundColor: "#eef1fd",
  },
  optionInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  optionBadge: {
    backgroundColor: "#f0f0f5",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  optionBadgeText: {
    fontSize: 11,
    color: "#888",
    fontWeight: "600",
  },
  optionText: {
    fontSize: 15,
    color: "#2d2d2d",
    fontWeight: "400",
  },
  optionTextSelected: {
    color: "#4361ee",
    fontWeight: "600",
  },
  checkmark: {
    fontSize: 16,
    color: "#4361ee",
    fontWeight: "700",
  },

  // Empty
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "#aaa",
  },
});