#!/usr/bin/env python3
"""
Script de prueba para desencriptar archivos PKA usando Python
Basado en ptexplorer de axcheron
"""

import sys
import zlib

# Algoritmo de ptexplorer para versión 5.x
def decrypt_v5(data):
    """
    Decripta archivos PKA versión 5.x
    Algoritmo: XOR con tamaño de archivo + zlib decompress
    """
    file_size = len(data)
    print(f"[Python] Tamaño del archivo: {file_size} bytes")
    
    # XOR con tamaño de archivo
    decrypted = bytearray(file_size)
    for i in range(file_size):
        key = (file_size - i) & 0xFF
        decrypted[i] = data[i] ^ key
    
    # Los primeros 4 bytes son el tamaño descomprimido
    uncompressed_size = (decrypted[0] << 24) | (decrypted[1] << 16) | (decrypted[2] << 8) | decrypted[3]
    print(f"[Python] Tamaño descomprimido: {uncompressed_size} bytes")
    
    # Verificar magic bytes de zlib
    if decrypted[4] == 0x78 and decrypted[5] == 0x9C:
        print("[Python] Magic bytes de zlib encontrados (78 9C)")
        
        # Descomprimir
        compressed_data = bytes(decrypted[4:])
        try:
            xml_content = zlib.decompress(compressed_data)
            print(f"[Python] Descompresión exitosa: {len(xml_content)} bytes")
            return xml_content.decode('utf-8', errors='replace')
        except Exception as e:
            print(f"[Python] Error en descompresión: {e}")
            return None
    else:
        print(f"[Python] No se encontraron magic bytes de zlib")
        print(f"[Python] Bytes 4-5: {hex(decrypted[4])} {hex(decrypted[5])}")
        return None


def main():
    if len(sys.argv) < 2:
        print("Uso: python3 test_pka_python.py <archivo.pka>")
        sys.exit(1)
    
    filename = sys.argv[1]
    
    try:
        with open(filename, 'rb') as f:
            data = f.read()
        
        print("=" * 60)
        print("PRUEBA DE DESENCRIPTACIÓN PKA CON PYTHON")
        print("=" * 60)
        
        # Intentar versión 5.x
        result = decrypt_v5(data)
        
        if result:
            print("\n✅ ÉXITO - Archivo desencriptado")
            print(f"\nPrimeros 2000 caracteres del XML:")
            print(result[:2000])
            
            # Guardar XML
            output_file = filename.replace('.pka', '.xml')
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(result)
            print(f"\n💾 XML guardado en: {output_file}")
        else:
            print("\n❌ FALLÓ")
            # Mostrar primeros bytes para análisis
            print(f"Primeros 32 bytes (hex): {data[:32].hex()}")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
