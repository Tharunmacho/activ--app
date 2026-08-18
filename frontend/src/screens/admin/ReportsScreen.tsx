import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import api from '../../services/api';
import { Picker } from '@react-native-picker/picker';

type ReportsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Reports'
>;

interface Props {
  navigation: ReportsScreenNavigationProp;
}

type ReportType = 'users' | 'applications' | 'revenue' | 'performance' | 'demographics';
type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
type ExportFormat = 'pdf' | 'excel' | 'csv';

const ReportsScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('users');
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>('month');
  const [selectedExportFormat, setSelectedExportFormat] = useState<ExportFormat>('pdf');
  const [loading, setLoading] = useState(false);

  const reportTypes = [
    { value: 'users', label: 'User Report', description: 'Detailed user registration and activity data' },
    { value: 'applications', label: 'Application Report', description: 'Application status and processing time' },
    { value: 'revenue', label: 'Revenue Report', description: 'Financial transactions and revenue breakdown' },
    { value: 'performance', label: 'Performance Report', description: 'State/District/Block performance metrics' },
    { value: 'demographics', label: 'Demographics Report', description: 'User demographics and distribution' },
  ];

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      const response = await api.post('/admin/reports/generate', {
        reportType: selectedReportType,
        dateRange: selectedDateRange,
        exportFormat: selectedExportFormat,
      });

      Alert.alert(
        'Report Generated',
        `Your ${selectedExportFormat.toUpperCase()} report has been generated successfully.`,
        [
          {
            text: 'Download',
            onPress: () => {
              // Handle download logic here
              console.log('Downloading report:', response.data.downloadUrl);
            },
          },
          { text: 'OK' },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const renderReportTypeCard = (type: typeof reportTypes[0]) => (
    <TouchableOpacity
      key={type.value}
      style={[
        styles.reportTypeCard,
        selectedReportType === type.value && styles.reportTypeCardActive,
      ]}
      onPress={() => setSelectedReportType(type.value as ReportType)}
    >
      <View style={styles.reportTypeHeader}>
        <Text
          style={[
            styles.reportTypeTitle,
            selectedReportType === type.value && styles.reportTypeTitleActive,
          ]}
        >
          {type.label}
        </Text>
        {selectedReportType === type.value && (
          <View style={styles.selectedIndicator}>
            <Text style={styles.selectedIndicatorText}>✓</Text>
          </View>
        )}
      </View>
      <Text style={styles.reportTypeDescription}>{type.description}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Generate Reports</Text>
        <Text style={styles.headerSubtitle}>Create custom reports for analysis</Text>
      </View>

      {/* Report Type Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Report Type</Text>
        {reportTypes.map(renderReportTypeCard)}
      </View>

      {/* Date Range Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date Range</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedDateRange}
            onValueChange={(value) => setSelectedDateRange(value as DateRange)}
            style={styles.picker}
          >
            <Picker.Item label="Today" value="today" />
            <Picker.Item label="Last 7 Days" value="week" />
            <Picker.Item label="Last 30 Days" value="month" />
            <Picker.Item label="Last Quarter" value="quarter" />
            <Picker.Item label="Last Year" value="year" />
            <Picker.Item label="Custom Range" value="custom" />
          </Picker>
        </View>
      </View>

      {/* Export Format Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export Format</Text>
        <View style={styles.formatButtonsContainer}>
          <TouchableOpacity
            style={[
              styles.formatButton,
              selectedExportFormat === 'pdf' && styles.formatButtonActive,
            ]}
            onPress={() => setSelectedExportFormat('pdf')}
          >
            <Text
              style={[
                styles.formatButtonText,
                selectedExportFormat === 'pdf' && styles.formatButtonTextActive,
              ]}
            >
              PDF
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.formatButton,
              selectedExportFormat === 'excel' && styles.formatButtonActive,
            ]}
            onPress={() => setSelectedExportFormat('excel')}
          >
            <Text
              style={[
                styles.formatButtonText,
                selectedExportFormat === 'excel' && styles.formatButtonTextActive,
              ]}
            >
              Excel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.formatButton,
              selectedExportFormat === 'csv' && styles.formatButtonActive,
            ]}
            onPress={() => setSelectedExportFormat('csv')}
          >
            <Text
              style={[
                styles.formatButtonText,
                selectedExportFormat === 'csv' && styles.formatButtonTextActive,
              ]}
            >
              CSV
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Report Preview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Report Preview</Text>
        <View style={styles.previewCard}>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Report Type:</Text>
            <Text style={styles.previewValue}>
              {reportTypes.find(r => r.value === selectedReportType)?.label}
            </Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Date Range:</Text>
            <Text style={styles.previewValue}>{selectedDateRange.toUpperCase()}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Export Format:</Text>
            <Text style={styles.previewValue}>{selectedExportFormat.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* Generate Button */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.generateButton, loading && styles.generateButtonDisabled]}
          onPress={handleGenerateReport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.generateButtonText}>Generate Report</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Recent Reports */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Reports</Text>
        <View style={styles.recentReportsContainer}>
          <Text style={styles.emptyText}>No recent reports</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    opacity: 0.9,
  },
  section: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  reportTypeCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reportTypeCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  reportTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  reportTypeTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.textPrimary,
  },
  reportTypeTitleActive: {
    color: COLORS.primary,
  },
  reportTypeDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicatorText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
  },
  pickerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  formatButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formatButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.xs,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  formatButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  formatButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.textPrimary,
  },
  formatButtonTextActive: {
    color: COLORS.white,
  },
  previewCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  previewLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  previewValue: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.textPrimary,
  },
  generateButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
  },
  recentReportsContainer: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 8,
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
});

export default ReportsScreen;

