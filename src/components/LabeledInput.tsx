import { View, Text, TextInput, TextInputProps } from "react-native";
import { Theme } from "../theme/palettes";
import { makeStyles } from "../theme/styles";

interface LabeledInputProps extends TextInputProps {
  t: Theme;
  label: string;
  style?: any;
}

export function LabeledInput({ t, label, style, ...props }: LabeledInputProps) {
  const styles = makeStyles(t);
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 12, color: t.subtle, marginBottom: 6 }}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, style]}
        placeholderTextColor={t.subtle}
        selectionColor={t.blue}
        keyboardAppearance={t === t ? "dark" : "light"}
        clearButtonMode="while-editing"
        returnKeyType="done"
      />
    </View>
  );
}
