import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useMultiSigStore } from '../store/multiSigStore';
import { FontSize, FontWeight, Radius, Shadow, Spacing } from '../theme/tokens';

export function MultiSigApprovalScreen() {
  const { colors, isDark } = useTheme();
  const tasks = useMultiSigStore((state) => state.tasks);
  const queueApproval = useMultiSigStore((state) => state.queueApproval);

  const renderSigner = useCallback(
    (taskId: string, signer: { id: string; name: string; role: string; status: string }) => (
      <View key={signer.id} style={[styles.signerRow, { borderColor: colors.border }]}> 
        <View>
          <Text style={[styles.signerName, { color: colors.text }]}>{signer.name}</Text>
          <Text style={[styles.signerRole, { color: colors.textSecondary }]}>{signer.role}</Text>
        </View>
        <View style={styles.signerActions}>
          <Text style={[styles.signerStatus, { color: signer.status === 'approved' ? colors.success : colors.warning }]}>
            {signer.status.toUpperCase()}
          </Text>
          {signer.status === 'pending' ? (
            <Pressable
              onPress={() => queueApproval(taskId, signer.id)}
              style={({ pressed }) => [
                styles.approveButton,
                { backgroundColor: pressed ? colors.primaryLight : colors.primary },
              ]}
            >
              <Text style={[styles.approveText, { color: colors.textInverse }]}>Queue approval</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    ),
    [colors],
  );

  const content = useMemo(
    () => (
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.taskCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text style={[styles.taskTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.taskSubtitle, { color: colors.textSecondary }]}>{item.description}</Text>
            <View style={[styles.taskMeta, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}> 
              <Text style={[styles.taskMetaText, { color: colors.text }]}>{item.amount}</Text>
              <Text style={[styles.taskMetaText, { color: item.status === 'approved' ? colors.success : colors.warning }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
            <View style={styles.signerList}> 
              {item.signers.map((signer) => renderSigner(item.id, signer))}
            </View>
            {item.queuedApprovals.length > 0 ? (
              <Text style={[styles.queueNote, { color: colors.textSecondary }]}>Queued approvals: {item.queuedApprovals.join(', ')}</Text>
            ) : null}
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    ),
    [colors, renderSigner, tasks],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}> 
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.container, { backgroundColor: colors.surface }]}> 
        <Text style={[styles.header, { color: colors.text }]}>Multi-Signature Workflow</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Queue approvals, synchronize signer state, and track pending co-signers in real time.</Text>
      </View>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    padding: Spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.extrabold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.base,
    lineHeight: 22,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing['4xl'],
  },
  taskCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
  },
  taskTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  taskSubtitle: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  taskMeta: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  taskMetaText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  signerList: {
    gap: Spacing.sm,
  },
  signerRow: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signerName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  signerRole: {
    fontSize: FontSize.xs,
  },
  signerActions: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  signerStatus: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  approveButton: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  approveText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  queueNote: {
    marginTop: Spacing.sm,
    fontSize: FontSize.xs,
  },
});
