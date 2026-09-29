import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colours, type } from "../../src/theme";

/**
 * Four tabs, named in words.
 *
 * No icon-only tabs: this association exists for students with special
 * needs, several of whom read the label rather than recognise a glyph. The
 * emoji beside each is decoration and is hidden from the screen reader,
 * which reads the word.
 */

function TabIcon({ symbol }: { symbol: string }) {
  return (
    <Text accessibilityElementsHidden importantForAccessibility="no" style={{ fontSize: 18 }}>
      {symbol}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colours.primary },
        headerTintColor: colours.white,
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: colours.primary,
        tabBarInactiveTintColor: colours.slate,
        tabBarStyle: { backgroundColor: colours.surface, borderTopColor: colours.line, minHeight: 60 },
        tabBarLabelStyle: { fontSize: type.tiny, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "News", tabBarIcon: () => <TabIcon symbol="📰" /> }}
      />
      <Tabs.Screen
        name="events"
        options={{ title: "Events", tabBarIcon: () => <TabIcon symbol="📅" /> }}
      />
      <Tabs.Screen
        name="portal"
        options={{ title: "Portal", tabBarIcon: () => <TabIcon symbol="👤" /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: "More", tabBarIcon: () => <TabIcon symbol="⋯" /> }}
      />
    </Tabs>
  );
}
