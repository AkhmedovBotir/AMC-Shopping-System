import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SampleData = [
  {
    _id: "1",
    product: {
      name: "Mahsulot 1",
      type: "Elektronika",
    },
    quantity: 2,
    totalPrice: 200000,
    createdAt: "2024-03-20T10:00:00.000Z",
  },
];

export default function SalesScreen() {
  const renderSaleItem = ({ item }) => (
    <View style={styles.saleCard}>
      <View style={styles.saleHeader}>
        <Text style={styles.productName}>{item.product.name}</Text>
        <Text style={styles.saleDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.saleDetails}>
        <Text style={styles.detailText}>Turi: {item.product.type}</Text>
        <Text style={styles.detailText}>Soni: {item.quantity}</Text>
        <Text style={styles.priceText}>{item.totalPrice.toLocaleString()} so'm</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sotuvlar tarixi</Text>
      </View>
      <FlatList
        data={SampleData}
        renderItem={renderSaleItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  listContainer: {
    padding: 15,
  },
  saleCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  saleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  saleDate: {
    fontSize: 14,
    color: "#666",
  },
  saleDetails: {
    gap: 5,
  },
  detailText: {
    fontSize: 14,
    color: "#666",
  },
  priceText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    marginTop: 5,
  },
}); 