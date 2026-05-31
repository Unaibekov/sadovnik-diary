import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { Platform, Share } from 'react-native';
import { buildCultureCardsReportWorkbook } from './reportService';

export async function shareCultureCardsReport(cultureCards, reportDeps) {
  const exportedAt = new Date().toISOString();
  const fileName = `sadovnik-diary-${exportedAt.slice(0, 10)}.xlsx`;
  const workbook = buildCultureCardsReportWorkbook(cultureCards, reportDeps);
  const reportBase64 = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'base64',
  });

  if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
    await Share.share({
      title: fileName,
      message: 'Excel-РѕС‚С‡РµС‚ Sadovnik Diary РїРѕРґРіРѕС‚РѕРІР»РµРЅ РІ РјРѕР±РёР»СЊРЅРѕРј РїСЂРёР»РѕР¶РµРЅРёРё.',
    });
    return 'web_ready';
  }

  const isSharingAvailable = await Sharing.isAvailableAsync();

  if (!isSharingAvailable) {
    await Share.share({
      title: fileName,
      message: 'Excel-РѕС‚С‡РµС‚ Sadovnik Diary РїРѕРґРіРѕС‚РѕРІР»РµРЅ, РЅРѕ РѕС‚РїСЂР°РІРєР° С„Р°Р№Р»РѕРІ РЅРµРґРѕСЃС‚СѓРїРЅР°.',
    });
    return 'native_unavailable';
  }

  const fileUri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, reportBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await Sharing.shareAsync(fileUri, {
    dialogTitle: 'РџРѕРґРµР»РёС‚СЊСЃСЏ РѕС‚С‡РµС‚РѕРј Sadovnik Diary',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    UTI: 'org.openxmlformats.spreadsheetml.sheet',
  });

  return 'native_shared';
}
