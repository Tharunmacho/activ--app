package com.activ

import android.Manifest
import android.content.ContentValues
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.pdf.PdfDocument
import android.media.MediaScannerConnection
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.uimanager.UIManagerHelper
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.min

/** All generated documents stay in the device's public Downloads directory. */
class ReportExportModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val busy = AtomicBoolean(false)
  override fun getName() = "ReportExport"

  private fun begin(promise: Promise): Boolean {
    if (busy.compareAndSet(false, true)) return true
    promise.reject("EXPORT_BUSY", "Wait for the current download to finish.")
    return false
  }

  @ReactMethod
  fun saveCsv(filename: String, csv: String, promise: Promise) {
    if (begin(promise)) writeAsync(filename, "text/csv", promise) { csv.toByteArray(Charsets.UTF_8) }
  }

  @ReactMethod
  fun saveSpreadsheet(filename: String, base64: String, promise: Promise) {
    if (!begin(promise)) return
    writeAsync(filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", promise) {
      val bytes = Base64.decode(base64, Base64.DEFAULT)
      require(bytes.size >= 4 && bytes[0] == 0x50.toByte() && bytes[1] == 0x4B.toByte()) { "Invalid Excel workbook." }
      bytes
    }
  }

  /** Draw the complete, unscaled sheet. Membership is landscape; tax is portrait. */
  @ReactMethod
  fun savePdf(filename: String, reactTag: Double, promise: Promise) {
    if (!begin(promise)) return
    context.runOnUiQueueThread {
      try {
        val tag = reactTag.toInt()
        val view = UIManagerHelper.getUIManagerForReactTag(context, tag)?.resolveView(tag)
          ?: throw IllegalStateException("The certificate is not ready.")
        check(view.width > 0 && view.height > 0) { "The certificate is still loading." }
        val landscape = view.width > view.height
        val pageWidth = if (landscape) 842 else 595
        val pageHeight = if (landscape) 595 else 842
        val bytes = ByteArrayOutputStream()
        val document = PdfDocument()
        try {
          val page = document.startPage(PdfDocument.PageInfo.Builder(pageWidth, pageHeight, 1).create())
          try {
            page.canvas.drawColor(Color.WHITE)
            val scale = min(pageWidth.toFloat() / view.width, pageHeight.toFloat() / view.height)
            page.canvas.translate((pageWidth - view.width * scale) / 2f, (pageHeight - view.height * scale) / 2f)
            page.canvas.scale(scale, scale)
            view.draw(page.canvas)
          } finally { document.finishPage(page) }
          document.writeTo(bytes)
        } finally { document.close() }
        writeAsync(filename, "application/pdf", promise) { bytes.toByteArray() }
      } catch (error: Exception) {
        busy.set(false)
        promise.reject("PDF_FAILED", "The PDF could not be prepared. Wait for the certificate to load and try again.", error)
      }
    }
  }

  private fun writeAsync(filename: String, mimeType: String, promise: Promise, data: () -> ByteArray) {
    Thread {
      try {
        val safeName = filename.replace(Regex("[^a-zA-Z0-9._ -]"), "-").trimStart('.', ' ').take(140)
        require(safeName.isNotBlank()) { "A filename is required." }
        val bytes = data()
        require(bytes.isNotEmpty()) { "The file is empty." }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          val resolver = context.contentResolver
          val values = ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, safeName)
            put(MediaStore.Downloads.MIME_TYPE, mimeType)
            put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
            put(MediaStore.Downloads.IS_PENDING, 1)
          }
          val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
            ?: throw IllegalStateException("Downloads could not be opened.")
          try {
            (resolver.openOutputStream(uri) ?: throw IllegalStateException("Downloads could not be written."))
              .use { it.write(bytes) }
            check(resolver.update(uri, ContentValues().apply { put(MediaStore.Downloads.IS_PENDING, 0) }, null, null) > 0)
          } catch (error: Exception) {
            // Only remove the incomplete file created by this request.
            resolver.delete(uri, null, null)
            throw error
          }
        } else {
          check(context.checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED) {
            "Allow storage access to save files in Downloads."
          }
          @Suppress("DEPRECATION")
          val directory = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
          check(directory.isDirectory || directory.mkdirs()) { "Downloads could not be opened." }
          val stem = safeName.substringBeforeLast('.', safeName)
          val extension = safeName.substringAfterLast('.', "").let { if (it.isEmpty()) "" else ".$it" }
          var file = File(directory, safeName)
          var suffix = 1
          // Never overwrite an earlier download, including concurrent writers.
          while (!file.createNewFile()) {
            check(suffix <= 10000) { "Too many files have the same name." }
            file = File(directory, "$stem (${suffix++})$extension")
          }
          try { file.outputStream().use { it.write(bytes) } }
          catch (error: Exception) { file.delete(); throw error }
          MediaScannerConnection.scanFile(context, arrayOf(file.absolutePath), arrayOf(mimeType), null)
        }
        promise.resolve(true)
      } catch (error: Exception) {
        promise.reject("EXPORT_FAILED", "The file could not be saved in Downloads. Check available storage and try again.", error)
      } finally { busy.set(false) }
    }.start()
  }
}

class ReportExportPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(ReportExportModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
