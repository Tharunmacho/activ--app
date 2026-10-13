# React Native and each native dependency supply their own consumer rules.
# Avoid broad keep rules: R8 must be able to optimise and obfuscate the release.
# Preserve source locations for Play Console crash retracing using mapping.txt.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
