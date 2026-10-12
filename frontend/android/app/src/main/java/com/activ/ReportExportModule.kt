package com.activ

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.pdf.PdfDocument
import android.util.Base64
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.uimanager.UIManagerHelper
import java.io.ByteArrayOutputStream
import kotlin.math.min

/** Uses Android's Files picker. No shared-storage permission or public report URL. */
class ReportExportModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context), ActivityEventListener {
  private var pending: Promise? = null
  private var contents: ByteArray? = null

  init { context.addActivityEventListener(this) }
  override fun getName() = "ReportExport"

  @ReactMethod
  fun saveCsv(filename: String, csv: String, promise: Promise) {
    context.runOnUiQueueThread {
      openPicker(filename, "text/csv", csv.toByteArray(Charsets.UTF_8), promise)
    }
  }

  @ReactMethod
  fun saveSpreadsheet(filename: String, base64: String, promise: Promise) {
    context.runOnUiQueueThread {
      try {
        val bytes = Base64.decode(base64, Base64.DEFAULT)
        require(bytes.size >= 4 && bytes[0] == 0x50.toByte() && bytes[1] == 0x4B.toByte()) { "Invalid Excel workbook." }
        openPicker(filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes, promise)
      } catch (error: Exception) {
        promise.reject("EXPORT_FAILED", "The Excel report could not be prepared. Please try again.", error)
      }
    }
  }

  /** Draw the full certificate sheet, independent of the phone's preview scale. */
  @ReactMethod
  fun savePdf(filename: String, reactTag: Double, promise: Promise) {
    context.runOnUiQueueThread {
      if (pending != null) {
        promise.reject("EXPORT_BUSY", "Finish saving the current file first.")
        return@runOnUiQueueThread
      }
      try {
        val tag = reactTag.toInt()
        val view = UIManagerHelper.getUIManagerForReactTag(context, tag)?.resolveView(tag)
          ?: throw IllegalStateException("The certificate is not ready. Wait for it to load and try again.")
        check(view.width > 0 && view.height > 0) { "The certificate is still loading. Please try again." }
        val bytes = ByteArrayOutputStream()
        val document = PdfDocument()
        try {
          val page = document.startPage(PdfDocument.PageInfo.Builder(595, 842, 1).create())
          try {
            page.canvas.drawColor(Color.WHITE)
            val scale = min(595f / view.width, 842f / view.height)
            page.canvas.translate((595f - view.width * scale) / 2f, (842f - view.height * scale) / 2f)
            page.canvas.scale(scale, scale)
            view.draw(page.canvas)
          } finally {
            document.finishPage(page)
          }
          document.writeTo(bytes)
        } finally {
          document.close()
        }
        openPicker(filename, "application/pdf", bytes.toByteArray(), promise)
      } catch (error: Exception) {
        android.util.Log.e("ActivPdf", "Certificate PDF rendering failed", error)
        promise.reject("PDF_FAILED", "The certificate PDF could not be prepared. Wait for it to load and try again.", error)
      }
    }
  }

  private fun openPicker(filename: String, mimeType: String, bytes: ByteArray, promise: Promise) {
    val activity = context.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "Open ACTIV before saving a file.")
    } else if (pending != null) {
      promise.reject("EXPORT_BUSY", "Finish saving the current file first.")
    } else {
      pending = promise
      contents = bytes
      try {
        activity.startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
          addCategory(Intent.CATEGORY_OPENABLE)
          type = mimeType
          putExtra(Intent.EXTRA_TITLE, filename)
        }, REQUEST_CODE)
      } catch (error: Exception) {
        pending = null
        contents = null
        promise.reject("EXPORT_FAILED", "The Files picker could not be opened.", error)
      }
    }
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != REQUEST_CODE) return
    val promise = pending ?: return
    val bytes = contents ?: byteArrayOf()
    pending = null
    contents = null
    if (resultCode != Activity.RESULT_OK) { promise.resolve(false); return }
    val uri = data?.data
    if (uri == null) { promise.reject("EXPORT_FAILED", "No file location was selected."); return }
    Thread {
      try {
        val output = context.contentResolver.openOutputStream(uri, "wt")
          ?: throw IllegalStateException("The selected file could not be opened.")
        output.use { it.write(bytes) }
        promise.resolve(true)
      } catch (error: Exception) {
        promise.reject("EXPORT_FAILED", "The file could not be saved. Choose another location.", error)
      }
    }.start()
  }

  override fun onNewIntent(intent: Intent) = Unit

  override fun invalidate() {
    context.removeActivityEventListener(this)
    pending?.reject("EXPORT_CLOSED", "The app closed before the report was saved.")
    pending = null
    contents = null
    super.invalidate()
  }

  companion object { private const val REQUEST_CODE = 4812 }
}

class ReportExportPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(ReportExportModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
