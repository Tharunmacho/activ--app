#import <React/RCTBridgeModule.h>
#import <React/RCTUtils.h>
#import <UIKit/UIKit.h>

@interface ReportExport : NSObject <RCTBridgeModule, UIDocumentPickerDelegate>
@property(nonatomic, copy) RCTPromiseResolveBlock resolveExport;
@property(nonatomic, copy) RCTPromiseRejectBlock rejectExport;
@property(nonatomic, strong) NSURL *exportDirectory;
- (void)cleanUp;
- (void)exportData:(NSData *)data filename:(NSString *)filename resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
@end

@implementation ReportExport
RCT_EXPORT_MODULE();
+ (BOOL)requiresMainQueueSetup { return YES; }
- (dispatch_queue_t)methodQueue { return dispatch_get_main_queue(); }

RCT_REMAP_METHOD(saveCsv, saveCsv:(NSString *)filename contents:(NSString *)contents
                 resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  [self exportData:[contents dataUsingEncoding:NSUTF8StringEncoding] filename:filename resolver:resolve rejecter:reject];
}

RCT_REMAP_METHOD(saveSpreadsheet, saveSpreadsheet:(NSString *)filename base64:(NSString *)base64
                 resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  NSData *data = [[NSData alloc] initWithBase64EncodedString:base64 options:0];
  const unsigned char *bytes = (const unsigned char *)data.bytes;
  if (data.length < 4 || bytes[0] != 0x50 || bytes[1] != 0x4B) {
    reject(@"EXPORT_FAILED", @"The Excel report could not be prepared. Please try again.", nil);
    return;
  }
  [self exportData:data filename:filename resolver:resolve rejecter:reject];
}

- (void)exportData:(NSData *)data filename:(NSString *)filename resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject
{
  if (self.resolveExport) {
    reject(@"EXPORT_BUSY", @"Finish saving the current report first.", nil);
    return;
  }
  UIViewController *presenter = RCTPresentedViewController();
  if (!presenter) {
    reject(@"NO_ACTIVITY", @"Open ACTIV before exporting a report.", nil);
    return;
  }
  self.resolveExport = resolve;
  self.rejectExport = reject;
  self.exportDirectory = [NSURL fileURLWithPath:[NSTemporaryDirectory() stringByAppendingPathComponent:NSUUID.UUID.UUIDString] isDirectory:YES];
  NSURL *directory = self.exportDirectory;
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    NSError *error = nil;
    [[NSFileManager defaultManager] createDirectoryAtURL:directory withIntermediateDirectories:YES attributes:nil error:&error];
    NSURL *file = [directory URLByAppendingPathComponent:filename.lastPathComponent];
    if (!error) [data writeToURL:file options:NSDataWritingAtomic error:&error];
    dispatch_async(dispatch_get_main_queue(), ^{
      if (error) {
        self.rejectExport(@"EXPORT_FAILED", @"The report could not be prepared.", error);
        [self cleanUp];
        return;
      }
      UIDocumentPickerViewController *picker = [[UIDocumentPickerViewController alloc] initForExportingURLs:@[file] asCopy:YES];
      picker.delegate = self;
      picker.modalPresentationStyle = UIModalPresentationFormSheet;
      [presenter presentViewController:picker animated:YES completion:nil];
    });
  });
}

- (void)documentPicker:(UIDocumentPickerViewController *)controller didPickDocumentsAtURLs:(NSArray<NSURL *> *)urls
{
  if (self.resolveExport) self.resolveExport(@(urls.count > 0));
  [self cleanUp];
}

- (void)documentPickerWasCancelled:(UIDocumentPickerViewController *)controller
{
  if (self.resolveExport) self.resolveExport(@NO);
  [self cleanUp];
}

- (void)cleanUp
{
  if (self.exportDirectory) [[NSFileManager defaultManager] removeItemAtURL:self.exportDirectory error:NULL];
  self.exportDirectory = nil;
  self.resolveExport = nil;
  self.rejectExport = nil;
}
@end
