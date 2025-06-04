import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { Text, View } from "react-native";
import { users } from "../db/schema";
import { useDrizzle } from "../hooks/drizzlleConnection";

export default function Index() {
  const db = useDrizzle();
  const { data } = useLiveQuery(db.select().from(users));

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>{JSON.stringify(data)}</Text>
    </View>
  );
}
