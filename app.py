import os
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_notes():
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
    except Exception as e:
        # Return a custom error structure that the frontend can display
        return {"error": f"Failed to fetch release notes: {str(e)}"}

    try:
        # Parse Atom Feed XML
        root = ET.fromstring(response.content)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        
        for entry in root.findall('atom:entry', ns):
            # Parse Date/Title
            title_el = entry.find('atom:title', ns)
            date_str = title_el.text.strip() if title_el is not None else "Unknown Date"
            
            # Parse ID
            id_el = entry.find('atom:id', ns)
            entry_id = id_el.text.strip() if id_el is not None else ""
            
            # Parse Link (alternate or standard)
            link_el = entry.find('atom:link[@rel="alternate"]', ns)
            if link_el is None:
                link_el = entry.find('atom:link', ns)
            link_url = link_el.attrib.get('href', '') if link_el is not None else ""
            
            # Parse Content HTML
            content_el = entry.find('atom:content', ns)
            content_html = content_el.text if content_el is not None else ""
            
            if not content_html:
                continue
                
            # Parse content HTML to split into individual items by <h3> headers
            soup = BeautifulSoup(content_html, 'html.parser')
            
            items = []
            current_item = None
            current_description_parts = []
            
            for el in soup.contents:
                # Ignore whitespace/text nodes directly under the root content
                if el.name == 'h3':
                    if current_item:
                        current_item['description'] = "".join(current_description_parts).strip()
                        items.append(current_item)
                    
                    type_text = el.get_text().strip()
                    current_item = {
                        'date': date_str,
                        'type': type_text,
                        'id': f"{entry_id}_{type_text}_{len(items)}",
                        'link': link_url,
                        'description': ''
                    }
                    current_description_parts = []
                elif el.name is not None:
                    if current_item:
                        # Ensure links inside descriptions open in a new tab
                        for a in el.find_all('a', href=True):
                            a['target'] = '_blank'
                            a['rel'] = 'noopener noreferrer'
                        current_description_parts.append(str(el))
                    else:
                        # Default wrapper if no <h3> header is present at the beginning
                        current_item = {
                            'date': date_str,
                            'type': 'Update',
                            'id': f"{entry_id}_Update_{len(items)}",
                            'link': link_url,
                            'description': ''
                        }
                        for a in el.find_all('a', href=True):
                            a['target'] = '_blank'
                            a['rel'] = 'noopener noreferrer'
                        current_description_parts.append(str(el))
            
            if current_item:
                current_item['description'] = "".join(current_description_parts).strip()
                items.append(current_item)
                
            entries.extend(items)
            
        return {"notes": entries}
        
    except Exception as e:
        return {"error": f"Failed to parse release notes XML: {str(e)}"}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    result = fetch_and_parse_notes()
    if "error" in result:
        return jsonify(result), 500
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
